/*
 * Breach: [mod_layout] box_d.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-11 spolu  Removed angularJS
 * - 2014-06-04 spolu  Move to `mod_layout`
 * - 2014-02-07 spolu  Creation
 */
'use strict'

// ### box_c
//
// ```
// @spec { box_div }
// ```
var box_c = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.box_el = spec.box_div || $('.box');
  my.input_el = my.box_el.find('input');
  my.form_el = my.box_el.find('form');

  my.value = null;
  my.last = null;
  my.mode = null;

  my.MODE_NORMAL = 1 << 0;
  my.MODE_FIND_IN_PAGE = 1 << 1;
  my.MODE_COMMAND = 1 << 2;

  //
  // ### _public_
  //
  var init;               /* init(); */

  //
  // ### _private_
  //
  var input_change_handler;   /* input_change_hanlder(); */
  var input_focusin_handler;  /* input_focusin_hanlder(); */
  var input_focusout_handler; /* input_focusout_hanlder(); */
  var input_keydown_handler;  /* input_keydown_handler(); */
  var form_submit_handler;    /* form_submit_hanlder(); */

  var state_handler;          /* state_handler(state); */
  var select_all_handler;     /* select_all_handler(); */
  var focus_handler;          /* focus_handler(); */

  var that = {}

  /**************************************************************************/
  /* JQUERY EVENTS HANDLER */
  /**************************************************************************/
  // ### input_change_handler
  //
  // Handler called on input value change
  input_change_handler = function() {
    var value = my.input_el.val();
    if(value !== my.last) {
      my.value = value;
      my.socket.emit('input', my.value);
      my.last = my.value;
    }
  };

  // ### input_focusin_handler
  //
  // Handler called on input focusin
  input_focusin_handler = function() {
    my.box_el.addClass('focus');
    setTimeout(function() {
      my.input_el.select();
    });
  }

  // ### input_focusout_handler
  //
  // Handler called on input focusin
  input_focusout_handler = function() {
    my.box_el.removeClass('focus');
    my.socket.emit('input', null);
  }

  // ### input_keydown_handler
  //
  // Handler called on keydown
  input_keydown_handler = function(evt) {
    if(evt.which === 27) {
      my.socket.emit('clear');
      my.box_el.find('input').blur();
    }
    if(my.mode === my.MODE_FIND_IN_PAGE && my.input_el.is(':focus')) {
      if(evt.which === 13 && (evt.ctrlKey || evt.metaKey)) {
        my.socket.emit('submit', { 
          input: my.input_el.val(), 
          is_ctrl: true
        });
        evt.preventDefault();
        evt.stopPropagation();
      }
    }
  }

  // ### form_submit_handler
  //
  // Handler called on input submit
  form_submit_handler = function(evt) {
    my.socket.emit('submit', { 
      input: my.input_el.val(), 
      is_ctrl: false
    });
    evt.preventDefault();
    evt.stopPropagation();
  };

  /**************************************************************************/
  /* SOCKET.IO HANDLER */
  /**************************************************************************/
  // ### state_handler
  //
  // Socket.io `state` event handler
  // ```
  // @state {object} the tabs state
  // ```
  state_handler = function(state) {
    if(state) {
      //console.log('+++++++++++++++++++++++++++++++++++');
      //console.log(JSON.stringify(state, null, 2));
      //console.log('+++++++++++++++++++++++++++++++++++');
      
      /* Input udpate. */
      if(state.input !== null) {
        my.value = state.input;
      }
      else if(state.url) {
        my.value = state.url.href;
      }
      else {
        my.value = '';
      }
      if(my.value !== my.last) {
        my.input_el.val(my.value);
      }
      my.last = my.value; 

      if(state.url) {
        my.box_el.find('.glass .host').text(state.url.host);
        my.box_el.find('.glass .path').text(state.url.path);
        my.box_el.find('.glass .hash').text(state.url.hash);
      }

      /* SSL update. */
      if(state.ssl && state.ssl.security_type === 'authenticated') {
        my.box_el.addClass('ssl_auth');
      }
      else {
        my.box_el.removeClass('ssl_auth');
      }

      /* mode update. */
      my.mode = state.mode;
      switch(my.mode) {
        case my.MODE_FIND_IN_PAGE: {
          my.box_el.addClass('find_in_page');
          break;
        }
        default: {
          my.box_el.removeClass('find_in_page');
        }
      }
    }
  };

  // ### state_handler
  //
  // Socket.io `select_all` event handler
  select_all_handler = function() {
    my.input_el.focus().select();
  };

  // ### state_handler
  //
  // Socket.io `focus` event handler
  focus_handler = function() {
    my.input_el.focus();
  };

  /**************************************************************************/
  /* PUBLIC METHODS */
  /**************************************************************************/
  // ### init
  //
  // Initialises the controller
  init = function() {
    my.socket = io.connect();
    my.socket.on('state', state_handler);
    my.socket.on('select_all', select_all_handler);
    my.socket.on('focus', focus_handler);
    my.socket.emit('handshake', '_box');

    my.input_el.keyup(input_change_handler);
    my.input_el.focusin(input_focusin_handler);
    my.input_el.focusout(input_focusout_handler);
    my.input_el.keydown(input_keydown_handler);
    my.form_el.submit(form_submit_handler);

    return that;
  };


  that.init = init;

  return that;
};

/*
    
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

