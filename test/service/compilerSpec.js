'use strict';

describe('$compile', function() {
  var element;

  beforeEach(inject(provideLog, function($provide){
    element = null;
  }));

  afterEach(function(){
    dealoc(element);
  });

  function provideLogDirective($compileProvider, log) {
    $compileProvider.directive('log', function() {
      return { priority:10, compile: valueFn(function(scope, element, attrs) {
        log(attrs.log);
      })};
    });
  }


  describe('configuration', function() {
    it('should register a directive', inject(
        function($compileProvider) {
          $compileProvider.directive('div', function(log) {
            return function(scope, element) {
              log('OK');
              element.text('SUCCESS');
            };
          })
        },
        function($compile, $rootScope, log) {
          element = $compile('<div></div>')($rootScope);
          expect(element.text()).toEqual('SUCCESS');
          expect(log).toEqual('OK');
        }
    ));
  });


  describe('directives', function() {

    // TODO(i): these tests are messy and test many things at once - should be decoupled and
    //   untangled
    describe('multiple directives per element', function() {
      beforeEach(inject(provideLogDirective,
          function ($compileProvider) {
            $compileProvider.directive('a', function() {
              return { priority:3, compile: valueFn(function(scope, element) {
                element.text('A');
              })};
            });
            $compileProvider.directive('b', function() {
              return { priority:2, compile: valueFn(function(scope, element) {
                element.text( element.text() + 'B');
              })};
            });
            $compileProvider.directive('c', function() {
              return { priority:1, compile: valueFn(function(scope, element) {
                element.text( element.text() + 'C');
              })};
            });
            $compileProvider.directive('greet', function() {
              return { priority:10, compile: valueFn(function(scope, element, attrs) {
                element.text("Hello " + attrs.greet);
              })};
            });
          }));


      it('should allow multiple directives per element', inject(function($compile, $rootScope){
        element = $compile('<a b="" x-c=""></a>')($rootScope);
        expect(element.text()).toEqual('ABC');
      }));


      it('should recurse to children', inject(function($compile, $rootScope){
        element = $compile('<div>0<a>1</a>2<b>3</b>4</div>')($rootScope);
        expect(element.text()).toEqual('0A23B4');
      }));


      it('should allow directives in classes', inject(function($compile, $rootScope) {
        element = $compile('<div class="greet: angular; b:123; c"></div>')($rootScope);
        expect(element.html()).toEqual('Hello angularBC');
      }));


      it('should allow directives in comments', inject(provideLogDirective,
          function($compile, $rootScope, log) {
            element = $compile('<div>0<!-- directive: log angular -->1</div>')($rootScope);
            expect(log).toEqual('angular');
          }));


      it('should receive scope, element, and attributes', inject(
          function($compileProvider, $injector) {
            var injector = $injector;
            $compileProvider.directive('log', function($injector, $rootScope){
              expect($injector).toBe(injector); // verify that it is injectable
              return {
                compile: function(element, templateAttr) {
                  expect(typeof templateAttr.$normalize).toBe('function');
                  expect(typeof templateAttr.$set).toBe('function');
                  expect(isElement(templateAttr.$element)).toBeTruthy();
                  expect(element.text()).toEqual('unlinked');
                  expect(templateAttr.exp).toEqual('abc');
                  expect(templateAttr.aa).toEqual('A');
                  expect(templateAttr.bb).toEqual('B');
                  expect(templateAttr.cc).toEqual('C');
                  return function(scope, element, attr) {
                    expect(element.text()).toEqual('unlinked');
                    expect(attr).toBe(templateAttr);
                    expect(scope).toEqual($rootScope);
                    element.text('worked');
                  }
                }
              };
            });
          },
          function($rootScope, $compile) {
            element = $compile(
                '<div class="log" exp="abc" aa="A" x-Bb="B" daTa-cC="C">unlinked</div>')($rootScope);
            expect(element.text()).toEqual('worked');
          }
      ));
    });


    it('should handle exceptions', inject(
        function($compileProvider, $exceptionHandlerProvider) {
          $exceptionHandlerProvider.mode('log');
          $compileProvider.directive('factoryError', function() { throw 'FactoryError'; });
          $compileProvider.directive('templateError',
              valueFn({ compile: function() { throw 'TemplateError'; } }));
          $compileProvider.directive('linkingError',
              valueFn(function() { throw 'LinkingError'; }));
        },
        function($rootScope, $compile, $exceptionHandler) {
          element = $compile('<div factory-error template-error linking-error></div>')($rootScope);
          expect($exceptionHandler.errors[0]).toEqual('FactoryError');
          expect($exceptionHandler.errors[1][0]).toEqual('TemplateError');
          expect(ie($exceptionHandler.errors[1][1])).
              toEqual('<div factory-error linking-error template-error>');
          expect($exceptionHandler.errors[2][0]).toEqual('LinkingError');
          expect(ie($exceptionHandler.errors[2][1])).
              toEqual('<div factory-error linking-error template-error>');

          // crazy stuff to make IE happy
          function ie(text) {
            var list = [],
                parts;

            parts = lowercase(text).
                replace('<', '').
                replace('>', '').
                split(' ');
            parts.sort();
            forEach(parts, function(value, key){
              if (value.substring(0,3) == 'ng-') {
              } else {
                list.push(value.replace('=""', ''));
              }
            });
            return '<' + list.join(' ') + '>';
          }
        }
    ));


    it('should prevent changing of structure', inject(provideLogDirective,
        function($compile, $rootScope){
          element = jqLite("<div><div log></div></div>");
          var linkFn = $compile(element);
          element.append("<div></div>");
          expect(function() {
            linkFn($rootScope);
          }).toThrow('Template changed structure!');
        }));


    describe('attr', function() {

      it('should allow setting of attributes', inject(
          function($compileProvider) {
            $compileProvider.directive({
              setter: valueFn(function(scope, element, attr) {
                attr.$set('name', 'abc');
                attr.$set('disabled', true);
                expect(attr.name).toBe('abc');
                expect(attr.disabled).toBe(true);
              })
            });
          },
          function($rootScope, $compile) {
            element = $compile('<div setter></div>')($rootScope);
            expect(element.attr('name')).toEqual('abc');
            expect(element.attr('disabled')).toEqual('disabled');
          }
      ));


      it('should read boolean attributes as boolean', inject(
          function($compileProvider) {
            $compileProvider.directive({
              div: valueFn(function(scope, element, attr) {
                element.text(attr.required);
              })
            });
          },
          function($rootScope, $compile) {
            element = $compile('<div required></div>')($rootScope);
            expect(element.text()).toEqual('true');
          }
      ));
    });


    describe('bindings', function() {

      it('should compile and link both attribute and text bindings', inject(
          function($rootScope, $compile) {
            $rootScope.name = 'angular';
            element = $compile('<div name="attr: {{name}}">text: {{name}}</div>')($rootScope);
            $rootScope.$digest();
            expect(element.text()).toEqual('text: angular');
            expect(element.attr('name')).toEqual('attr: angular');
          }));


      it('should decorate the binding with ng-binding and interpolation function', inject(
          function($compile, $rootScope) {
            element = $compile('<div>{{1+2}}</div>')($rootScope);
            expect(element.hasClass('ng-binding')).toBe(true);
            expect(element.data('$binding')[0].exp).toEqual('{{1+2}}');
          }));
    });


    describe('directive config', function() {
      describe('priority', function() {

        it('should honor priority', inject(
            function($compileProvider ,log) {
              forEach({low:0, med:1, high:2}, function(priority, priorityName) {
                $compileProvider.directive(priorityName, valueFn({
                  compile: function() {
                    return log.fn(priorityName);
                  },
                  priority: priority
                }));
              });
            },
            function($rootScope, $compile, log) {
              element = $compile('<span low high med></span>')($rootScope);
              expect(log).toEqual('high; med; low');
            }
        ));
      });


      describe('terminal', function() {

        it('should prevent further directives from running', inject(
            function($compileProvider) {
              $compileProvider.directive('stop', valueFn({
                priority: -100, // even with negative priority we still should be able to stop descend
                terminal: true
              }));
            },
            function($rootScope, $compile) {
              element = $compile('<div stop><a>OK</a></div>')($rootScope);
              expect(element.text()).toEqual('OK');
            }
        ));


        it('should prevent further directives from running, but finish current priority level',
            inject(function($compileProvider, log) {
                  $compileProvider.directive('stop', valueFn({
                    priority: 10,
                    terminal: true,
                    compile: log.fn('stop')
                  }));
                  $compileProvider.directive('same', valueFn({
                    priority: 10,
                    compile: log.fn('same')
                  }));
                  $compileProvider.directive('low', valueFn({
                    compile: log.fn('low')
                  }));
                },
                function($rootScope, $compile, log) {
                  element = $compile('<div low stop same><a>OK</a></div>')($rootScope);
                  expect(element.text()).toEqual('OK');
                  expect(log.toArray().sort()).toEqual(['same', 'stop']);
                }
            ));
      });


      describe('restrict', function() {

        it('should allow restriction of attributes', inject(
            function($compileProvider, $provide, log) {
              forEach({div:'E', attr:'A', clazz:'C', all:'EAC'}, function(restrict, name) {
                $compileProvider.directive(name, valueFn({
                  restrict: restrict,
                  compile: valueFn(function(scope, element, attr) {
                    log(name);
                  })
                }));
              });
            },
            function($rootScope, $compile, log) {
              dealoc($compile('<span div class="div"></span>')($rootScope));
              expect(log).toEqual('');
              log.reset();

              dealoc($compile('<div></div>')($rootScope));
              expect(log).toEqual('div');
              log.reset();

              dealoc($compile('<attr class=""attr"></attr>')($rootScope));
              expect(log).toEqual('');
              log.reset();

              dealoc($compile('<span attr></span>')($rootScope));
              expect(log).toEqual('attr');
              log.reset();

              dealoc($compile('<clazz clazz></clazz>')($rootScope));
              expect(log).toEqual('');
              log.reset();

              dealoc($compile('<span class="clazz"></span>')($rootScope));
              expect(log).toEqual('clazz');
              log.reset();

              dealoc($compile('<all class="all" all></all>')($rootScope));
              expect(log).toEqual('all; all; all');
            }
        ));
      });


      describe('html', function() {

        it('should replace element with template', inject(
            function($compileProvider){
              $compileProvider.directive('replace', valueFn({
                html: '<div class="myWidget" new="newAttr"><<CONTENT>></div>',
                compile: function(element, attr){
                  attr.$set('compile', true);
                }
              }));
            },
            function($compile, $rootScope) {
              dealoc(element = $compile(
                  '<div>' +
                      '<span replace class="a b c" old="oldAttr">widget content</span>' +
                      '</div>')($rootScope));
              var div = element.find('div');
              expect(div.attr('old')).toEqual("oldAttr");
              expect(div.attr('new')).toEqual("newAttr");
              expect(div.attr('compile')).toEqual("true");
              expect(div.attr('class')).toEqual('a b c myWidget');
            }
        ));
      });


      describe('scope', function() {

        beforeEach(inject(function($compileProvider, log) {
          forEach(['a', 'b'], function(name) {
            $compileProvider.directive('scope' + uppercase(name), valueFn({
              scope: true,
              compile: function() {
                return function (scope, element) {
                  log(scope.$id);
                  expect(element.data('$scope')).toBe(scope);
                };
              }
            }));
          });
          $compileProvider.directive('log', valueFn(function(scope){
            log('log-' + scope.$id);
          }));
        }));


        it('should allow creation of new scopes', inject(function($rootScope, $compile, log) {
          element = $compile('<div><span scope-a><a log></a></span></div>')($rootScope);
          expect(log).toEqual('log-002; 002');
        }));


        it('should not allow more then one scope creation per element', inject(
            function($rootScope, $compile) {
              expect(function(){
                $compile('<div class="scope-a; scope-b"></div>');
              }).toThrow('Multiple directives [scopeA, scopeB] asking for new scope on: ' +
                  '<' + (msie < 9 ? 'DIV' : 'div') + ' class="scope-a; scope-b">');
            }));


        it('should treat new scope on new template as noop', inject(
            function($rootScope, $compile, log) {
              $compile('<div scope-a></div>')($rootScope);
              expect(log).toEqual('001');
            }));
      });
    });
  });


  describe('attr', function() {

    it('should allow setting of attributes', inject(
        function($compileProvider) {
          $compileProvider.directive({
            setter: valueFn(function(scope, element, attr) {
              attr.$set('name', 'abc');
              attr.$set('disabled', true);
              expect(attr.name).toBe('abc');
              expect(attr.disabled).toBe(true);
            })
          });
        },
        function($rootScope, $compile) {
          element = $compile('<div setter></div>')($rootScope);
          expect(element.attr('name')).toEqual('abc');
          expect(element.attr('disabled')).toEqual('disabled');
        }
    ));


    it('should read boolean attributes as boolean', inject(
        function($compileProvider) {
          $compileProvider.directive({
            div: valueFn(function(scope, element, attr) {
              element.text(attr.required);
            })
          });
        },
        function($rootScope, $compile) {
          element = $compile('<div required></div>')($rootScope);
          expect(element.text()).toEqual('true');
        }
    ));


    it('should create new instance of attr for each template stamping', inject(
        function($compileProvider, $provide) {
          var state = { first: [], second: [] };
          $provide.value('state', state);
          $compileProvider.directive({
            first: valueFn({
              priority: 1,
              compile: function(templateElement, templateAttr) {
                return function(scope, element, attr) {
                  state.first.push({
                    template: {element: templateElement, attr:templateAttr},
                    link: {element: element, attr: attr}
                  });
                }
              }
            }),
            second: valueFn({
              priority: 2,
              compile: function(templateElement, templateAttr) {
                return function(scope, element, attr) {
                  state.second.push({
                    template: {element: templateElement, attr:templateAttr},
                    link: {element: element, attr: attr}
                  });
                }
              }
            })
          });
        },
        function($rootScope, $compile, state) {
          var template = $compile('<div first second>');
          dealoc(template($rootScope.$new(), noop));
          dealoc(template($rootScope.$new(), noop));

          // instance between directives should be shared
          expect(state.first[0].template.element).toBe(state.second[0].template.element);
          expect(state.first[0].template.attr).toBe(state.second[0].template.attr);

          // the template and the link can not be the same instance
          expect(state.first[0].template.element).not.toBe(state.first[0].link.element);
          expect(state.first[0].template.attr).not.toBe(state.first[0].link.attr);

          // each new template needs to be new instance
          expect(state.first[0].link.element).not.toBe(state.first[1].link.element);
          expect(state.first[0].link.attr).not.toBe(state.first[1].link.attr);
          expect(state.second[0].link.element).not.toBe(state.second[1].link.element);
          expect(state.second[0].link.attr).not.toBe(state.second[1].link.attr);
        }
    ));


    describe('$set', function() {
      var attr;
      beforeEach(inject(
        function($compileProvider) {
          $compileProvider.directive('div', valueFn(function(scope, element, attr){
            scope.attr = attr;
          }));
        },
        function($compile, $rootScope) {
          element = $compile('<div></div>')($rootScope);
          attr = $rootScope.attr;
          expect(attr).toBeDefined();
        }
      ));


      it('should set attributes', function() {
        attr.$set('ngMyAttr', 'value');
        expect(element.attr('ng-my-attr')).toEqual('value');
        expect(attr.ngMyAttr).toEqual('value');
      });


      it('should allow overriding of attribute name and remember the name', function() {
        attr.$set('ngOther', '123', 'other');
        expect(element.attr('other')).toEqual('123');
        expect(attr.ngOther).toEqual('123');

        attr.$set('ngOther', '246');
        expect(element.attr('other')).toEqual('246');
        expect(attr.ngOther).toEqual('246');
      });


      it('should set boolean attributes', function() {
        attr.$set('disabled', 'true');
        attr.$set('readOnly', 'true');
        expect(element.attr('disabled')).toEqual('disabled');
        expect(element.attr('readonly')).toEqual('readonly');

        attr.$set('disabled', 'false');
        expect(element.attr('disabled')).toEqual(undefined);

        attr.$set('disabled', false);
        attr.$set('readOnly', false);
        expect(element.attr('disabled')).toEqual(undefined);
        expect(element.attr('readonly')).toEqual(undefined);
      });


      it('should remove attribute', function() {
        attr.$set('ngMyAttr', 'value');
        expect(element.attr('ng-my-attr')).toEqual('value');

        attr.$set('ngMyAttr', undefined);
        expect(element.attr('ng-my-attr')).toBe(undefined);

        attr.$set('ngMyAttr', 'value');
        attr.$set('ngMyAttr', null);
        expect(element.attr('ng-my-attr')).toBe(undefined);
      })
    });
  });


  describe('linking', function() {

    beforeEach(inject(function($compileProvider, log) {

      forEach(['a', 'b', 'c'], function(name) {
        $compileProvider.directive(name, valueFn({
          compile: function() {
            log('t' + uppercase(name))
            return {
              pre: function() {
                log('pre' + uppercase(name));
              },
              post: function linkFn() {
                log('post' + uppercase(name));
              }
            };
          }
        }));
      });
    }));


    it('should not store linkingFns for noop branches', inject(function ($rootScope, $compile) {
      var element = jqLite('<div name="{{a}}"><span>ignore</span></div>');
      var template = $compile(element);
      // Now prune the branches with no directives
      element.find('span').remove();
      expect(element.find('span').length).toBe(0);
      // and we should still be able to compile without errors
      template($rootScope);
    }));


    it('should compile from top to bottom but link from bottom up', inject(
        function($compile, $rootScope, log) {
          $compile('<a b><c></c></a>')($rootScope);
          expect(log).toEqual('tA; tB; tC; preA; preB; preC; postC; postA; postB');
        }
    ));
  });
});
