/*
 * Breach: [mod_layout] box_d.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * 2014-06-04 spolu  Move to `mod_layout`
 * 2014-02-07 spolu  Creation
 */
'use strict'

//
// ### BoxCtrl
// `box` directive controller
//
angular.module('breach.directives').controller('BoxCtrl',
  function($scope, $element, _socket) {

    var _input = jQuery($element).find('input'); 

    /**************************************************************************/
    /* ANGULAR INTEGRATION */
    /**************************************************************************/
    $scope.$watch('state', function(state) {
      if(state) {
        //console.log('+++++++++++++++++++++++++++++++++++');
        //console.log(JSON.stringify(state, null, 2));
        //console.log('+++++++++++++++++++++++++++++++++++');
        if(state.input !== null) {
          $scope.value = state.input;
        }
        else if(state.url) {
          $scope.value = state.url.href;
        }
        else {
          $scope.value = '';
        }
        $scope.last = $scope.value; 
        $scope.title = state.title;
      }
    });

    $scope.$watch('value', function(value) {
      if($scope.value !== $scope.last) {
        _socket.emit('input', $scope.value);
        $scope.last = $scope.value;
      }
    });

    $scope.submit = function() {
      _socket.emit('submit', { 
        input: $scope.value, 
        is_ctrl: false
      });
    };

    _socket.on('select_all', function() {
      _input.focus().select();
    });

    _socket.on('focus', function() {
      _input.focus();
    });

    /*
    _input.keydown(function(evt) {
      switch($scope.mode) {
        case MODE_FIND_IN_PAGE: {
          if(evt.keyCode === 27) {
            _socket.emit('box_input_out');
          }
          break;
        }
        case MODE_NORMAL: {
          if(evt.keyCode === 27) {
            _socket.emit('box_input_out');
          }
          break;
        }
      }
    });
    _input.focusout(function() {
      switch($scope.mode) {
        case MODE_FIND_IN_PAGE: {
          _socket.emit('box_input_out');
          break;
        }
      }
    });
    
    _input.keydown(function(e) {
      if($scope.mode === MODE_FIND_IN_PAGE && _input.is(':focus')) {
        if(e.which === 13 && (e.ctrlKey || e.metaKey)) {
          _socket.emit('box_input_submit', { 
            input: $scope.value, 
            is_ctrl: true
          });
          e.preventDefault();
          e.stopPropagation();
        }
      }
    });


    $scope.find_match = function() {
      if($scope.mode === MODE_FIND_IN_PAGE) {
        if($scope.value.length > 0) {
          return $scope.mode_args.matches;
        }
      }
      return null;
    };
    */
  });

//
// ## box
//
// Directive representing the actual box
//
// ```
// @=state    {} the current tabs state
// ```
//
angular.module('breach.directives').directive('box', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      state: '=state',
    },
    templateUrl: 'box_d.html',
    controller: 'BoxCtrl'
  };
});
