'use strict';


/**
 * @ngdoc object
 * @name angular.module.ng.$routeProvider
 * @function
 *
 * @description
 *
 * Used for configuring routes. See {@link angular.module.ng.$route $route} for an example.
 */
function $RouteProvider(){
  var routes = {};

  /**
   * @ngdoc method
   * @name angular.module.ng.$routeProvider#when
   * @methodOf angular.module.ng.$routeProvider
   *
   * @param {string} path Route path (matched against `$location.path`). If `$location.path`
   *    contains redudant trailing slash or is missing one, the route will still match and the
   *    `$location.path` will be updated to add or drop the trailing slash to exacly match the
   *    route definition.
   * @param {Object} route Mapping information to be assigned to `$route.current` on route
   *    match.
   *
   *    Object properties:
   *
   *    - `controller` – `{function()=}` – Controller fn that should be associated with newly
   *      created scope.
   *    - `template` – `{string=}` – path to an html template that should be used by
   *      {@link angular.module.ng.$compileProvider.directive.ng-view ng-view} or
   *      {@link angular.module.ng.$compileProvider.directive.ng-include ng-include} directives.
   *    - `redirectTo` – {(string|function())=} – value to update
   *      {@link angular.module.ng.$location $location} path with and trigger route redirection.
   *
   *      If `redirectTo` is a function, it will be called with the following parameters:
   *
   *      - `{Object.<string>}` - route parameters extracted from the current
   *        `$location.path()` by applying the current route template.
   *      - `{string}` - current `$location.path()`
   *      - `{Object}` - current `$location.search()`
   *
   *      The custom `redirectTo` function is expected to return a string which will be used
   *      to update `$location.url()`.
   *
   *    - `[reloadOnSearch=true]` - {boolean=} - reload route when only $location.search()
   *    changes.
   *
   *      If the option is set to `false` and url in the browser changes, then
   *      `$routeUpdate` event is broadcasted on the root scope.
   *
   * @returns {Object} self
   *
   * @description
   * Adds a new route definition to the `$route` service.
   */
  this.when = function(path, route) {
    routes[path] = extend({reloadOnSearch: true}, route);

    // create redirection for trailing slashes
    if (path) {
      var redirectPath = (path[path.length-1] == '/')
          ? path.substr(0, path.length-1)
          : path +'/';

      routes[redirectPath] = {redirectTo: path};
    }

    return this;
  };

  /**
   * @ngdoc method
   * @name angular.module.ng.$routeProvider#otherwise
   * @methodOf angular.module.ng.$routeProvider
   *
   * @description
   * Sets route definition that will be used on route change when no other route definition
   * is matched.
   *
   * @param {Object} params Mapping information to be assigned to `$route.current`.
   * @returns {Object} self
   */
  this.otherwise = function(params) {
    this.when(null, params);
    return this;
  };


  this.$get = ['$rootScope', '$location', '$routeParams', '$q', '$injector', '$exceptionHandler',
      function( $rootScope,  $location,  $routeParams, $q, $injector, $exceptionHandler) {

    /**
     * @ngdoc object
     * @name angular.module.ng.$route
     * @requires $location
     * @requires $routeParams
     *
     * @property {Object} current Reference to the current route definition.
     * @property {Array.<Object>} routes Array of all configured routes.
     *
     * @description
     * Is used for deep-linking URLs to controllers and views (HTML partials).
     * It watches `$location.url()` and tries to map the path to an existing route definition.
     *
     * You can define routes through {@link angular.module.ng.$routeProvider $routeProvider}'s API.
     *
     * The `$route` service is typically used in conjunction with {@link angular.module.ng.$compileProvider.directive.ng-view ng-view}
     * directive and the {@link angular.module.ng.$routeParams $routeParams} service.
     *
     * @example
       This example shows how changing the URL hash causes the `$route` to match a route against the
       URL, and the `ng-view` pulls in the partial.

       Note that this example is using {@link angular.module.ng.$compileProvider.directive.script inlined templates}
       to get it working on jsfiddle as well.

      <doc:example module="route">
        <doc:source>
          <script type="text/ng-template" id="examples/book.html">
            controller: {{name}}<br />
            Book Id: {{params.bookId}}<br />
          </script>

          <script type="text/ng-template" id="examples/chapter.html">
            controller: {{name}}<br />
            Book Id: {{params.bookId}}<br />
            Chapter Id: {{params.chapterId}}
          </script>

          <script>
            angular.module('route', [], function($routeProvider, $locationProvider) {
              $routeProvider.when('/Book/:bookId', {template: 'examples/book.html', controller: BookCntl});
              $routeProvider.when('/Book/:bookId/ch/:chapterId', {template: 'examples/chapter.html', controller: ChapterCntl});

              // configure html5 to get links working on jsfiddle
              $locationProvider.html5Mode(true);
            });

            function MainCntl($scope, $route, $routeParams, $location) {
              $scope.$route = $route;
              $scope.$location = $location;
              $scope.$routeParams = $routeParams;
            }

            function BookCntl($scope, $routeParams) {
              $scope.name = "BookCntl";
              $scope.params = $routeParams;
            }

            function ChapterCntl($scope, $routeParams) {
              $scope.name = "ChapterCntl";
              $scope.params = $routeParams;
            }
          </script>

          <div ng-controller="MainCntl">
            Choose:
            <a href="/Book/Moby">Moby</a> |
            <a href="/Book/Moby/ch/1">Moby: Ch1</a> |
            <a href="/Book/Gatsby">Gatsby</a> |
            <a href="/Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
            <a href="/Book/Scarlet">Scarlet Letter</a><br/>

            <div ng-view></div>
            <hr />

            <pre>$location.path() = {{$location.path()}}</pre>
            <pre>$route.current.template = {{$route.current.template}}</pre>
            <pre>$route.current.params = {{$route.current.params}}</pre>
            <pre>$route.current.scope.name = {{$route.current.scope.name}}</pre>
            <pre>$routeParams = {{$routeParams}}</pre>
          </div>
        </doc:source>
        <doc:scenario>
          it('should load and compile correct template', function() {
            element('a:contains("Moby: Ch1")').click();
            var content = element('.doc-example-live [ng-view]').text();
            expect(content).toMatch(/controller\: ChapterCntl/);
            expect(content).toMatch(/Book Id\: Moby/);
            expect(content).toMatch(/Chapter Id\: 1/);

            element('a:contains("Scarlet")').click();
            content = element('.doc-example-live [ng-view]').text();
            expect(content).toMatch(/controller\: BookCntl/);
            expect(content).toMatch(/Book Id\: Scarlet/);
          });
        </doc:scenario>
      </doc:example>
     */

    /**
     * @ngdoc event
     * @name angular.module.ng.$route#$beforeRouteChange
     * @eventOf angular.module.ng.$route
     * @eventType broadcast on root scope
     * @description
     * Broadcasted before a route change.
     *
     * @param {Route} next Future route information.
     * @param {Route} current Current route information.
     */

    /**
     * @ngdoc event
     * @name angular.module.ng.$route#$afterRouteChange
     * @eventOf angular.module.ng.$route
     * @eventType broadcast on root scope
     * @description
     * Broadcasted after a route change.
     *
     * @param {Route} current Current route information.
     * @param {Route} previous Previous route information.
     */

    /**
     * @ngdoc event
     * @name angular.module.ng.$route#$routeUpdate
     * @eventOf angular.module.ng.$route
     * @eventType broadcast on root scope
     * @description
     *
     * The `reloadOnSearch` property has been set to false, and we are reusing the same
     * instance of the Controller.
     */

    var matcher = switchRouteMatcher,
        dirty = 0,
        forceReload = false,
        $route = {
          routes: routes,

          /**
           * @ngdoc method
           * @name angular.module.ng.$route#reload
           * @methodOf angular.module.ng.$route
           *
           * @description
           * Causes `$route` service to reload the current route even if
           * {@link angular.module.ng.$location $location} hasn't changed.
           *
           * As a result of that, {@link angular.module.ng.$compileProvider.directive.ng-view ng-view}
           * creates new scope, reinstantiates the controller.
           */
          reload: function() {
            dirty++;
            forceReload = true;
          }
        };

    $rootScope.$watch(function() { return dirty + $location.url(); }, updateRoute);

    return $route;

    /////////////////////////////////////////////////////

    function switchRouteMatcher(on, when) {
      // TODO(i): this code is convoluted and inefficient, we should construct the route matching
      //   regex only once and then reuse it
      var regex = '^' + when.replace(/([\.\\\(\)\^\$])/g, "\\$1") + '$',
          params = [],
          dst = {};
      forEach(when.split(/\W/), function(param) {
        if (param) {
          var paramRegExp = new RegExp(":" + param + "([\\W])");
          if (regex.match(paramRegExp)) {
            regex = regex.replace(paramRegExp, "([^\\/]*)$1");
            params.push(param);
          }
        }
      });
      var match = on.match(new RegExp(regex));
      if (match) {
        forEach(params, function(name, index) {
          dst[name] = match[index + 1];
        });
      }
      return match ? dst : null;
    }

    function updateRoute() {
      var next = parseRoute(),
          last = $route.current,
          initObj;

      if (next && last && next.$route === last.$route
          && equals(next.pathParams, last.pathParams) && !next.reloadOnSearch && !forceReload) {
        last.params = next.params;
        copy(last.params, $routeParams);
        $rootScope.$broadcast('$routeUpdate', last);
      } else if (next || last) {
        forceReload = false;
        $rootScope.$broadcast('$beforeRouteChange', next, last);

        initObj = (next && next.init)
            ? $injector.invoke(next.init, null, {$nextRouteParams: next.params})
            : {};

        qShallow(initObj).then(function(locals) {
          $route.current = next;
          if (next) {
            next.locals = locals;
            if (next.redirectTo) {
              redirectTo(next.redirectTo);
            } else {
              copy(next.params, $routeParams);
            }
          }
          $rootScope.$broadcast('$afterRouteChange', next, last);
        }, function(error) {
          if (error.redirectTo) {
            redirectTo(error.redirectTo);
            $rootScope.$broadcast('$afterRouteChange', next, last);
          } else {
            $exceptionHandler(error);
          }
        });
      }

      function redirectTo(destination) {
        if (isString(destination)) {
          $location.url(interpolate(destination, next.params)).
                    replace();
        } else {
          $location.url(destination(next.pathParams, $location.path(), $location.search())).
                    replace();
        }
      }
    }


    /**
     * @returns the current active route, by matching it against the URL
     */
    function parseRoute() {
      // Match a route
      var params, match;
      forEach(routes, function(route, path) {
        if (!match && (params = matcher($location.path(), path))) {
          match = inherit(route, {
            params: extend({}, $location.search(), params),
            pathParams: params});
          match.$route = route;
        }
      });
      // No route matched; fallback to "otherwise" route
      return match || routes[null] && inherit(routes[null], {params: {}, pathParams:{}});
    }

    /**
     * @returns interpolation of the redirect path with the parametrs
     */
    function interpolate(string, params) {
      var result = [];
      forEach((string||'').split(':'), function(segment, i) {
        if (i == 0) {
          result.push(segment);
        } else {
          var segmentMatch = segment.match(/(\w+)(.*)/);
          var key = segmentMatch[1];
          result.push(params[key]);
          result.push(segmentMatch[2] || '');
          delete params[key];
        }
      });
      return result.join('');
    }


    function qShallow(obj) {
      var deferred = $q.defer(),
          result = {},
          counter = 0;

      forEach(obj, function(promise, key) {
        counter++;
        $q.when(promise).then(function(value) {
          result[key] = value;
          counter--;
          if (!counter) deferred.resolve(result);
        }, function(error) {
          deferred.reject(error);
        });
      });

      if (!counter) deferred.resolve(result);

      return deferred.promise;
    }
  }];
}
