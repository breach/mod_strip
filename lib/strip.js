/*
 * Breach: [mod_layout] strip.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu  Creation
 */
"use strict"

var common = require('./common.js');

var async = require('async');
var breach = require('breach_module');

// ### strip
//
// ```
// @spec { http_port }
// ```
var strip = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.http_port = spec.http_port;
  my.keyboard_shortcuts = null;
  my.sockets = [];

  //
  // ### _public_
  //
  var handshake;                    /* handshake(socket) */
  var init;                         /* init(cb_); */
  var kill;                         /* kill(cb_); */

  //
  // ### _private_
  //
  var socket_push;                  /* socket_push(); */

  var socket_select;                /* socket_select(name); */
  var socket_close;                 /* socket_close(name); */
  var socket_back;                  /* socket_back(); */
  var socket_forward;               /* socket_forward(); */
  var socket_new;                   /* socket_new(); */
  var box_load_url_handler;         /* box_load_url_handler(evt); */

  var shortcut_new;                 /* shortcut_new(); */
  var shortcut_next;                /* shortcut_next(); */
  var shortcut_prev;                /* shortcut_prev(); */
  var shortcut_close;               /* shortcut_close(); */
  var shortcut_back;                /* shortcut_back(); */
  var shortcut_forward;             /* shortcut_forward(); */
  var shortcut_reload;              /* shortcut_reload(); */
  var shortcut_recover;             /* shortcut_recover(); */
  var shortcut_commit;              /* shortcut_commit(); */
  var shortcut_go;                  /* shortcut_go(); */

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### socket_push
  //
  // Pushes the current state on the UI socket
  // ```
  // @state {object} the tabs state
  // ```
  socket_push = function(update) {
    //console.log(update);
    my.sockets.forEach(function(s) {
      s.emit('state', update);
    });
  };

  /****************************************************************************/
  /* SOCKET EVENT HANDLERS */
  /****************************************************************************/
  // ### socket_select
  //
  // Received when a tab is selected from the UI
  // ```
  // @tab_d {string} the tab id
  // ```
  socket_select = function(tab_id) {
    common._.tabs.action_select(tab_id);
    common._.tabs.action_commit();
  };

  // ### socket_close
  //
  // Received when a tab is closed from the UI
  // ```
  // @tab_d {string} the tab id
  // ```
  socket_close = function(tab_id) {
    common._.tabs.action_close(tab_id);
  };

  // ### socket_back
  //
  // Received when the prev button is clicked
  socket_back = function() {
    common._.tabs.action_back();
  };
  // ### socket_forward
  //
  // Received when the next button is pushed
  socket_forward = function() {
    common._.tabs.action_forward();
  };

  // ### socket_new
  //
  // Received when the new_tab button is pushed
  socket_new = function() {
    common._.tabs.action_new();
    shortcut_go();
  };

  /****************************************************************************/
  /* BOX EVENT HANDLERS */
  /****************************************************************************/
  // ### box_load_url_handler
  //
  // Handler called when the box request to load an URL for a given tab
  // ```
  // @evt {object} { url }
  // ```
  box_load_url_handler = function(evt) {
    common._.tabs.action_load(evt.url);
  };

  /****************************************************************************/
  /* KEYBOARD SHORTCUTS EVENT HANDLERS */
  /****************************************************************************/
  // ### shortcut_new
  //
  // Keyboard shortcut to create a new tab
  shortcut_new = function() {
    common._.tabs.action_new();
    setTimeout(shortcut_go, 50);
  };

  // ### shortcut_next
  //
  // Keyboard shortcut to select next tab
  shortcut_next = function() {
    common._.tabs.action_next();
  };

  // ### shortcut_prev
  //
  // Keyboard shortcut to select prev tab
  shortcut_prev = function() {
    common._.tabs.action_prev();
  };

  // ### shortcut_close
  //
  // Keyboard shortcut to close current Tab
  shortcut_close = function() {
    common._.tabs.action_close();
  };

  // ### shortcut_back
  //
  // Keyboard shortcut to go back the current tab
  shortcut_back = function() {
    common._.tabs.action_back();
  };

  // ### shortcut_forward
  //
  // Keyboard shortcut to go forward the current tab
  shortcut_forward = function() {
    common._.tabs.action_forward();
  };

  // ### shortcut_reload
  //
  // Keyboard shortcut to reload current tab
  shortcut_reload = function() {
    common._.tabs.action_reload();
  };

  // ### shortcut_recover
  //
  // Keyboard shortcut to select prev tab
  shortcut_recover = function() {
    common._.tabs.action_recover();
  };

  // ### shortcut_commit
  //
  // Keyboard shortcut to select prev tab
  shortcut_commit = function() {
    common._.tabs.action_commit();
  };


  // ### shortcut_go
  //
  // Keyboard shortcut to select the box
  shortcut_go = function() {
    breach.module('mod_layout').call('box_select_all');
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
    socket.on('select', socket_select);
    socket.on('close', socket_close);
    socket.on('back', socket_back);
    socket.on('forward', socket_forward);
    socket.on('new', socket_new);
    socket_push(common._.tabs.state());

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
    async.series([
      function(cb_) {
        my.keyboard_shortcuts = 
          require('./keyboard_shortcuts.js').keyboard_shortcuts({});

        my.keyboard_shortcuts.on('new', shortcut_new);
        my.keyboard_shortcuts.on('next', shortcut_next);
        my.keyboard_shortcuts.on('prev', shortcut_prev);
        my.keyboard_shortcuts.on('close', shortcut_close);
        my.keyboard_shortcuts.on('back', shortcut_back);
        my.keyboard_shortcuts.on('forward', shortcut_forward);
        my.keyboard_shortcuts.on('reload', shortcut_reload);
        my.keyboard_shortcuts.on('recover', shortcut_recover);
        my.keyboard_shortcuts.on('commit', shortcut_commit);
        my.keyboard_shortcuts.on('go', shortcut_go);

        common._.tabs.on('state', function(state) {
          socket_push(state);
        });

        /* We listen to ourselves as the box object sends event publicly. */
        breach.module('mod_layout').on('load_url', box_load_url_handler);

        return cb_();
      },
      function(cb_) {
        async.parallel([
          my.keyboard_shortcuts.init,
        ], cb_);
      },
      function(cb_) {
        breach.module('core').call('controls_set', {
          type: 'TOP',
          url: 'http://localhost:' + my.http_port + '/strip',
          dimension: 45
        }, cb_);
      },
    ], cb_);
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    breach.module('core').call('controls_unset', {
      type: 'TOP',
    }, cb_);
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  common.method(that, 'handshake', handshake, _super);

  return that;
};

exports.strip = strip;

