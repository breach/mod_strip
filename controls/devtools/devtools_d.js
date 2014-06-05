/*
 * Breach: [mod_stack] devtools_d.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * 2014-02-18 spolu    Creation
 */
'use strict'

//
// ### DevToolsCtrl
// `devtools` directive controller
//
angular.module('breach.directives').controller('DevToolsCtrl',
  function($scope, $element, $window, $timeout, $sce, _socket) {

    $scope.loading = false;

    /**************************************************************************/
    /* ANGULAR INTEGRATION */
    /**************************************************************************/
    $scope.$watch('state', function(state) {
      if(state) {
        $scope.devtools_url = $sce.trustAsResourceUrl(state.devtools_url);
      }
    });
  });

//
// ## box
//
// Directive representing the top box
//
// ```
// @=state    {} the current tabs state
// ```
//
angular.module('breach.directives').directive('devtools', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      state: '=state',
    },
    templateUrl: 'devtools_d.html',
    controller: 'DevToolsCtrl'
  };
});
