/*
 * Breach: [mod_layout] devtools.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu   Move to `mod_layout`
 * - 2014-02-18 spolu   Creation
 */
var common = require('./common.js');

var async = require('async');
var breach = require('breach_module');

// ### devtools
//
// ```
// @spec { http_port }
// ```
var devtools = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.http_port = spec.http_port;
  my.devtools_url = null;
  
  my.sockets = [];

  //
  // ### _public_
  //
  var handshake;                 /* handshake(socket) */
  var init;                      /* init(cb_); */
  var kill;                      /* kill(cb_); */

  //
  // ### _private_
  //
  var socket_push;               /* socket_push(); */

  var stack_devtools_handler;    /* stack_devtools_handler(evt); */

  //
  // ### _exposed_
  //
  
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### socket_push
  //
  // Pushes the current state on the UI socket
  socket_push = function() {
    var update = {
      devtools_url: my.devtools_url || 
        'http://localhost:' + my.http_port + '/devtools/blank.html',
    };
    my.sockets.forEach(function(s) {
      s.emit('state', update);
    });
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS */
  /****************************************************************************/

  /****************************************************************************/
  /* SOCKET EVENT HANDLERS */
  /****************************************************************************/

  /****************************************************************************/
  /* STACK EVENT HANDLERS */
  /****************************************************************************/
  // ### stack_devtools_handler
  //
  // Handler called when the mod_stack requests to display the dev tools on
  // a given URL.
  // ```
  // @evt {object} the event data
  // ```
  stack_devtools_handler = function(evt) {
    if(my.devtools_url !== evt.devtools_url) {
      my.devtools_url = evt.devtools_url;
      if(my.devtools_url) {
        breach.module('core').call('controls_dimension', {
          type: 'BOTTOM',
          dimension: 400,
          focus: true
        });
      }
      else {
        breach.module('core').call('controls_dimension', {
          type: 'BOTTOM',
          dimension: 0
        });
      }
      socket_push();
    }
  };

  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### handshake
  //
  // Called when the UI client connected to the Socket
  // ```
  // @socket {socket.io} the socket.io to connect with
  // ```
  handshake = function(socket) {
    my.sockets.push(socket);
    socket_push();

    socket.on('disconnect', function() {
      common.remove(my.sockets, socket);
    });
  };


  // ### init 
  //
  // Called at initialisation of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  init = function(cb_) {
    breach.module(null).on('devtools', stack_devtools_handler);

    breach.module('core').call('controls_set', {
      type: 'BOTTOM',
      url: 'http://localhost:' + my.http_port + '/devtools',
      dimension: 0
    });

    return cb_();
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    breach.module('core').call('controls_unset', {
      type: 'BOTTOM',
    }, cb_);
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  common.method(that, 'handshake', handshake, _super);

  return that;
};

exports.devtools = devtools;
