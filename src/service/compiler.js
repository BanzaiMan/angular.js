'use strict';

/**
 * @ngdoc function
 * @name angular.module.ng.$compile
 * @function
 *
 * @description
 * Compiles a piece of HTML string or DOM into a template and produces a template function, which
 * can then be used to link {@link angular.module.ng.$rootScope.Scope scope} and the template together.
 *
 * The compilation is a process of walking the DOM tree and trying to match DOM elements to
 * {@link angular.markup markup}, {@link angular.attrMarkup attrMarkup},
 * {@link angular.widget widgets}, and {@link angular.directive directives}. For each match it
 * executes corresponding markup, attrMarkup, widget or directive template function and collects the
 * instance functions into a single template function which is then returned.
 *
 * The template function can then be used once to produce the view or as it is the case with
 * {@link angular.widget.@ng:repeat repeater} many-times, in which case each call results in a view
 * that is a DOM clone of the original template.
 *
   <pre>
    angular.injector('ng').invoke(null, function($rootScope, $compile) {
      // Chose one:

      // A: compile the entire window.document.
      var element = $compile(window.document)($rootScope);

      // B: compile a piece of html
      var element = $compile('<div ng:click="clicked = true">click me</div>')($rootScope);

      // C: compile a piece of html and retain reference to both the dom and scope
      var element = $compile('<div ng:click="clicked = true">click me</div>')(scope);
      // at this point template was transformed into a view
    });
   </pre>
 *
 *
 * @param {string|DOMElement} element Element or HTML to compile into a template function.
 * @returns {function(scope[, cloneAttachFn])} a template function which is used to bind template
 * (a DOM element/tree) to a scope. Where:
 *
 *  * `scope` - A {@link angular.module.ng.$rootScope.Scope Scope} to bind to.
 *  * `cloneAttachFn` - If `cloneAttachFn` is provided, then the link function will clone the
 *               `template` and call the `cloneAttachFn` function allowing the caller to attach the
 *               cloned elements to the DOM document at the appropriate place. The `cloneAttachFn` is
 *               called as: <br/> `cloneAttachFn(clonedElement, scope)` where:
 *
 *      * `clonedElement` - is a clone of the original `element` passed into the compiler.
 *      * `scope` - is the current scope with which the linking function is working with.
 *
 * Calling the template function returns the element of the template. It is either the original element
 * passed in, or the clone of the element if the `cloneAttachFn` is provided.
 *
 * It is important to understand that the returned scope is "linked" to the view DOM, but no linking
 * (instance) functions registered by {@link angular.directive directives} or
 * {@link angular.widget widgets} found in the template have been executed yet. This means that the
 * view is likely empty and doesn't contain any values that result from evaluation on the scope. To
 * bring the view to life, the scope needs to run through a $digest phase which typically is done by
 * Angular automatically, except for the case when an application is being
 * {@link guide/dev_guide.bootstrap.manual_bootstrap} manually bootstrapped, in which case the
 * $digest phase must be invoked by calling {@link angular.module.ng.$rootScope.Scope#$apply}.
 *
 * If you need access to the bound view, there are two ways to do it:
 *
 * - If you are not asking the linking function to clone the template, create the DOM element(s)
 *   before you send them to the compiler and keep this reference around.
 *   <pre>
 *     var $injector = angular.injector('ng');
 *     var scope = $injector.invoke(null, function($rootScope, $compile){
 *       var element = $compile('<p>{{total}}</p>')($rootScope);
 *     });
 *   </pre>
 *
 * - if on the other hand, you need the element to be cloned, the view reference from the original
 *   example would not point to the clone, but rather to the original template that was cloned. In
 *   this case, you can access the clone via the cloneAttachFn:
 *   <pre>
 *     var original = angular.element('<p>{{total}}</p>'),
 *         scope = someParentScope.$new(),
 *         clone;
 *
 *     $compile(original)(scope, function(clonedElement, scope) {
 *       clone = clonedElement;
 *       //attach the clone to DOM document at the right place
 *     });
 *
 *     //now we have reference to the cloned DOM via `clone`
 *   </pre>
 *
 *
 * Compiler Methods For Widgets and Directives:
 *
 * The following methods are available for use when you write your own widgets, directives,
 * and markup.  (Recall that the compile function's this is a reference to the compiler.)
 *
 *  `compile(element)` - returns linker -
 *  Invoke a new instance of the compiler to compile a DOM element and return a linker function.
 *  You can apply the linker function to the original element or a clone of the original element.
 *  The linker function returns a scope.
 *
 *  * `comment(commentText)` - returns element - Create a comment element.
 *
 *  * `element(elementName)` - returns element - Create an element by name.
 *
 *  * `text(text)` - returns element - Create a text element.
 *
 *  * `descend([set])` - returns descend state (true or false). Get or set the current descend
 *  state. If true the compiler will descend to children elements.
 *
 *  * `directives([set])` - returns directive state (true or false). Get or set the current
 *  directives processing state. The compiler will process directives only when directives set to
 *  true.
 *
 * For information on how the compiler works, see the
 * {@link guide/dev_guide.compiler Angular HTML Compiler} section of the Developer Guide.
 */


$CompileProvider.$inject = ['$injector'];
function $CompileProvider($injector) {
  var directiveCache = {},
      directiveFactories = {},
      COMMENT_DIRECTIVE_REGEXP = /^\s*directive\:\s*([\d\w\-_]+)\s+(.*)$/,
      CLASS_DIRECTIVE_REGEXP = /(([\d\w\-_]+)(?:\:([^;]+))?;?)/,
      SIDE_EFFECT_ATTRS = {};

  forEach('src,href,multiple,selected,checked,disabled,readonly,required'.split(','), function(name) {
    SIDE_EFFECT_ATTRS[name] = SIDE_EFFECT_ATTRS[camelCase('ng-' + name)] = name;
  });


  this.directive = function registerDirective(name, directive){
    // TODO(misko): this is too complex clean it up and merge with getDirective
    if (isString(name)) {
      assertArg(directive, 'directive');
      directiveCache[name] = false;
      directiveFactories[name] = function() {
        directive = $injector.invoke(null, directive);
        if (isFunction(directive)) {
          directive = { templateFn: valueFn(directive) };
        }
        directive.priority = directive.priority || 0;
        directive.name = name;
        return directiveCache[name] = directive;
      }
    } else {
      forEach(name, function(fn, name) {
        registerDirective(name, fn);
      });
    }
    return this;
  };


  this.$get = ['$interpolate', '$exceptionHandler',
       function($interpolate,   $exceptionHandler) {

    return function(templateElement) {
      templateElement = jqLite(templateElement);
      var linkingFn = compileNodes(templateElement);
      return function(scope, cloneConnectFn){
        assertArg(scope, 'scope');
        // important!!: we must call our jqLite.clone() since the jQuery one is trying to be smart
        // and sometimes changes the structure of the DOM.
        var element = cloneConnectFn
          ? JQLitePrototype.clone.call(templateElement) // IMPORTANT!!!
          : templateElement;
        element.data('$scope', scope);
        cloneConnectFn && cloneConnectFn(element, scope);
        linkingFn && linkingFn(scope, element, true);
        return element;
      };
    };

    //================================

    /**
     * Sorting function for bound directives.
     * @param a
     * @param b
     */
    function byPriority(a, b) {
      return b.priority - a.priority;
    }

    /**
     * looks up the directive and decorates it with exception handling and proper parameters. We
     * call this the boundDirective.
     *
     * @param name name of the directive to look up.
     * @param templateAttrs list of current normalized attributes for the directive
     * @param attrName name of the non-normilize attribute where the value was read from.
     * @param attrValue value for the attribute.
     * @returns bound directive function.
     */
    function getDirective(name) {
      if (directiveFactories.hasOwnProperty(name)) {
        try {
          return directiveCache[name] || (directiveCache[name] = directiveFactories[name]());
        } catch(e) { $exceptionHandler(e); }
      }
    }

    /**
     * Once the directives have been collected they are sorted and then applied to the element
     * by priority order.
     *
     * @param directives
     * @param templateNode
     * @returns linkingFn
     */
    function applyDirectivesPerElement(linkFns, directives, templateNode, templateAttrs) {
      directives.sort(byPriority);
      var terminalPriority = -Number.MAX_VALUE;

      // executes all directives at a given element
      for(var i = 0, ii = directives.length,
            linkingFns = [], directive,
            newScopeDirective = null,
            element = templateAttrs.$element = jqLite(templateNode); i < ii; i++) {
        try {
          directive = directives[i];
          if (directive.scope) {
            if (newScopeDirective) {
              throw Error('Multiple directives [' + newScopeDirective.name + ', ' +
                directive.name + '] asking for new scope on: ' +
                elementOnlyHTML(templateAttrs.$element));
            }
            newScopeDirective = directive;
          }
          if (terminalPriority > directive.priority) {
            break; // prevent further processing of directives
          }
          directive.templateFn && linkingFns.push(directive.templateFn(element, templateAttrs));
        } catch (e) {
          $exceptionHandler(e);
        }
        if (directive.terminal) {
          linkFn.terminal = true;
          terminalPriority = Math.max(terminalPriority, directive.priority);
        }
      }
      linkFn.scope = !!newScopeDirective;
      
      return linkFn;
      
      ////////////////////

      function linkFn(childLinkingFn, scope, linkNode) {
        var attrs, element, ii = linkingFns.length, linkingFn, i;
        if (templateNode === linkNode) {
          attrs = templateAttrs;
          element = attrs.$element;
        } else {
          attrs = {};
          // this is a shallow copy which replaces $element;
          for(var key in templateAttrs) {
            if (templateAttrs.hasOwnProperty(key)) {
              if (key == '$element') {
                element = attrs.$element = jqLite(linkNode);
              } else {
                attrs[key] = templateAttrs[key];
              }
            }
          }
        }

        // PRELINKING
        for(i = 0; i < ii; i++) {
          if ((linkingFn = linkingFns[i]) && (linkingFn = linkingFn.pre)) {
            try {
              linkingFn(scope, element, attrs);
            } catch (e) {
              $exceptionHandler(e);
            }
          }
        }

        childLinkingFn && childLinkingFn(scope, linkNode.childNodes);

        // POSTLINKING
        for(i = 0; i < ii; i++) {
          if (typeof (linkingFn = linkingFns[i]) == 'object') {
            linkingFn = linkingFn.post;
          }
          if (linkingFn) {
            try {
              linkingFn(scope, element, attrs);
            } catch (e) {
              $exceptionHandler(e);
            }
          }
        }
        return scope;
      };
    }

    function textInterpolateDirective(interpolateFn) {
      return {
        priority: 0,
        templateFn: valueFn(function(scope, node) {
          var parent = node.parent(),
              bindings = parent.data('$ngBinding') || [];
          bindings.push(interpolateFn);
          parent.data('$ngBinding', bindings).addClass('ng-binding');
          scope.$watch(interpolateFn, function(scope, value) {
            node[0].nodeValue = value;
          });
        })
      };
    }

    function attrInterpolateDirective(value, name) {
      var interpolateFn = $interpolate(value, true);
      if (SIDE_EFFECT_ATTRS[name]) {
        name = SIDE_EFFECT_ATTRS[name];
        if (BOOLEAN_ATTR[name]) {
          value = true;
        }
      } else if (!interpolateFn) {
        // we are not a side-effect attr, and we have no side-effects -> ignore
        return null;
      }
      return {
        priority: 100,
        templateFn: function(element, attr) {
          if (interpolateFn) {
            return function(scope, element, attr) {
              scope.$watch(interpolateFn, function(scope, value){
                attr.$set(name, value);
              });
            };
          } else {
            attr.$set(name, value);
          }
        }
      };
    }

    /**
     * Compile function matches the nodeList against the directives, and then executes the
     * directive template function.
     * @param nodeList
     * @returns a composite linking function of all of the matched directives.
     */
    function compileNodes(nodeList) {
      var linkingFns = [],
          haveLinkingFn = null;

      for(var i = 0; i < nodeList.length; i++) {
        var node = nodeList[i],
            nodeType = node.nodeType,
            childNodes,
            directiveLinkingFn = null,
            childLinkingFn = null,
            directives = [],
            directive,
            expName = undefined,
            expValue = undefined,
            attrsMap = {},
            attrs = {
              $attr: attrsMap,
              $normalize: camelCase,
              $set: attrSetter},
            match,
            text;

        switch(nodeType) {
          case 1: /* Element */
            // use the node name: <directive>
            if (directive = getDirective(camelCase(nodeName_(node).toLowerCase()))) {
              directives.push(directive);
            }

            // iterate over the attributes
            for (var attr, name, nName, value, nAttrs = node.attributes,
                     j = 0, jj = nAttrs && nAttrs.length; j < jj; j++) {
              attr = nAttrs[j];
              nName = camelCase((name = attr.name).toLowerCase());
              attrsMap[nName] = name;
              attrs[nName] = value = trim((msie && name == 'href')
                  ? decodeURIComponent(node.getAttribute(name, 2))
                  : attr.value);
              if (BOOLEAN_ATTR[nName]) {
                attrs[nName] = true; // presence means true
              } else if (nName == 'exp') {
                expName = name;
                expValue = value;
              }
              if (directive = attrInterpolateDirective(value, nName)) {
                directives.push(directive);
              }
              if (directive = getDirective(nName)) {
                directives.push(directive);
              }
            }

            // use class as directive
            text = node.className;
            while (match = CLASS_DIRECTIVE_REGEXP.exec(text)) {
              if (directive = getDirective(nName = camelCase(match[2]))) {
                attrs[nName] = trim(match[3]);
                directives.push(directive);
              }
              text = text.substr(match.index + match[0].length);
            }

            break;
          case 3: /* Text Node */
            if (directive = $interpolate(node.nodeValue, true)) {
              directives.push(textInterpolateDirective(directive));
            }
            break;
          case 8: /* Comment */
            match = COMMENT_DIRECTIVE_REGEXP.exec(node.nodeValue);
            if (match &&
              (directive = getDirective(nName = camelCase(match[1]),  attrs))) {
              attrs[nName] = trim(match[2]);
              directives.push(directive);
            }
            break;
        }

        directiveLinkingFn = directives.length &&
          applyDirectivesPerElement(directiveLinkingFn, directives, node, attrs);

        childLinkingFn = (!directiveLinkingFn || !directiveLinkingFn.terminal) &&
          (childNodes = node.childNodes) && compileNodes(childNodes);

        linkingFns.push(directiveLinkingFn);
        linkingFns.push(childLinkingFn);
        haveLinkingFn = (haveLinkingFn || directiveLinkingFn || childLinkingFn);
      }

      // return a linking function if we have found anything.
      return haveLinkingFn &&
        function(scope, nodeList, rootElement) {
          if (linkingFns.length != nodeList.length * 2) {
            throw Error('Template changed structure!');
          }
          for(var childLinkingFn, directiveLinkingFn,
                  i=0, n=0, node, ii=linkingFns.length; i<ii; n++) {
            node = nodeList[n];
            directiveLinkingFn = linkingFns[i++];
            childLinkingFn = linkingFns[i++];

            if (directiveLinkingFn.scope && !rootElement) {
              jqLite(node).data('$scope', scope = scope.$new());
            }

            if (directiveLinkingFn) {
              directiveLinkingFn(childLinkingFn, scope, node);
            } else if (childLinkingFn) {
              childLinkingFn(scope, node.childNodes);
            }
          }
        }
    }
  }];

  // =============================

  // TODO(misko): it is not clear to me if the key should be normalize or not.
  // TODO(misko): this should also work for setting attributes in classes and comments
  function attrSetter(key, value) {
    var attrValue = value,
        booleanKey = BOOLEAN_ATTR[key.toLowerCase()];
    if (booleanKey) {
      value = toBoolean(value);
      this.$element.prop(key, value);
      this[key] = value;
      key = booleanKey;
      value = value ? booleanKey : undefined;
    } else {
      this[key] = value;
    }
    if (isUndefined(value)) {
      this.$element.removeAttr(key);
    } else {
      this.$element.attr(key, value);
    }
  }
    
}
