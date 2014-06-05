/*
 * Breach: [mod_layout] app.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu  Move to `mod_layout`
 * - 2014-02-07 spolu  Creation
 */
'use strict';

//
// ## App Module
//
angular.module('breach', ['breach.services', 
                          'breach.directives', 
                          'breach.filters']);

//
// ### BoxTopCtrl
// Initializations goes here as well as global objects
//
function BoxTopCtrl($scope, $location, $rootScope, $window, $timeout,
                    _socket) {

  /* Handhsaking */
  _socket.emit('handshake', '_box');

  _socket.on('state', function(state) {
    $scope.state = state;
    //console.log('========================================');
    //console.log(JSON.stringify(state, null, 2));
    //console.log('----------------------------------------');
  });
}

angular.module('breach.directives', []);
angular.module('breach.filters', []);
angular.module('breach.services', []);

