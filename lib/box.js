/*
 * Breach: [mod_layout] box.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu  Move to `mod_layout`
 * - 2014-02-07 spolu  Creation
 */
var common = require('./common.js');

var async = require('async');
var breach = require('breach_module');

// ### box
//
// ```
// @spec { http_port }
// ```
var box = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.http_port = spec.http_port;
  
  my.sockets = [];

  my.MODE_NORMAL = 1 << 0;
  my.MODE_FIND_IN_PAGE = 1 << 1;
  my.MODE_FILTER_TABS = 1 << 2;
  my.MODE_COMMAND = 1 << 3;

  my.state = {}
  my.mode = my.NODE_NORMAL;
  my.visible = null;

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

  var core_state_handler;        /* core_state_handler(evt); */
  var socket_submit;             /* socket_submit(name); */
  var stack_state_handler;       /* stack_state_handler(evt); */

  //
  // ### _exposed_
  //
  var exposed_find_in_page;      /* exposed_find_page(src, args, cb_); */
  var exposed_filter_tabs;       /* exposed_filter_tabs(src, args, cb_); */
  var exposed_get_listen_url;    /* exposed_get_listen_url(src, args, cb_); */
  var exposed_focus;             /* exposed_focus(src, args, cb_); */
  var exposed_select_all;        /* exposed_select_all(src, args, cb_); */

  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### socket_push
  //
  // Pushes the current state on the UI socket
  socket_push = function() {
    var update = {};
    if(my.state && my.visible) {
      update = my.state[my.visible];
    }
    my.sockets.forEach(function(s) {
      s.emit('state', update);
    });
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS */
  /****************************************************************************/
  // ### core_state_handler
  //
  // Handler called when the state is updated by the core module
  // ```
  // @state {object} the state
  // ```
  core_state_handler = function(state) {
    var now = Date.now();
    Object.keys(state).forEach(function(id) {
      if(state[id].visible) {
        my.visible = id;
      }
      my.state[id] = my.state[id] || {};
      if(typeof my.state[id].input === 'undefined')
        my.state[id].input = null;
      my.state[id].last_update = Date.now();
      if(state[id].entries) {
        state[id].entries.forEach(function(e) {
          if(e.visible) {
            if(e.url.href !== 'breach://default') {
              my.state[id].url = e.url;
              my.state[id].title = e.title;
              my.state[id].ssl = e.ssl;
            }
            else {
              my.state[id].url = null;
              my.state[id].title = null;
              my.state[id].ssl = null;
            }
          }
        });
      }
    });
    Object.keys(my.state).forEach(function(id) {
      if(my.state[id].last_update < now) {
        delete my.state[id];
      }
    });
    socket_push();
  };

  /****************************************************************************/
  /* SOCKET EVENT HANDLERS */
  /****************************************************************************/
  // ### socket_submit
  //
  // Received when a tab is selected from the UI
  // ```
  // @name {string} the tab id
  // ```
  socket_submit = function(data) {
    var submit_url = null;

    var url_r = /^(http(s{0,1})\:\/\/){0,1}[a-z0-9\-\.]+(\.[a-z0-9]{2,4})+/;
    var ip_r = /^(http(s{0,1})\:\/\/){0,1}[0-9]{1,3}(\.[0-9]{1,3}){3}/;
    var localhost_r = /^(http(s{0,1})\:\/\/){0,1}localhost+/;
    var host_r = /^http(s{0,1})\:\/\/[a-z0-9\-\.]+/;
    var http_r = /^http(s{0,1})\:\/\//;
    var file_r = /^(file\:\/\/).*/;
    var breach_r = /^breach\:\/\//;

    if(url_r.test(data.input) || 
       ip_r.test(data.input) || 
       localhost_r.test(data.input) || 
       host_r.test(data.input)) {
      if(!http_r.test(data.input)) {
        data.input = 'http://' + data.input;
      }
      submit_url = data.input;
    }
    else if(file_r.test(data.input)) {
      submit_url = data.input;
    }
    else if(breach_r.test(data.input)) {
      submit_url = data.input;
    }
    else {
      submit_url = 'https://www.google.com/search?' +
                   'q=' + escape(data.input) + '&' +
                   'ie=UTF-8';
    }
    console.log('URL: ' + submit_url);
    breach.emit('load_url', {
      url: submit_url
    });
    if(my.state[my.visible]) {
      my.state[my.visible].input = null;
      my.state[my.visible].url = {
        href: submit_url
      };
      my.state[my.visible].title = null;
      my.state[my.visible].ssl = null;
    }
    socket_push();
  };

  // ### socket_input
  //
  // Received when some input is entered in the box
  // ```
  // @name {string} the tab id
  // ```
  socket_input = function(value) {
    if(my.state[my.visible]) {
      my.state[my.visible].input = value;
    }
    socket_push();
  };

  /****************************************************************************/
  /* EXPOSED RPC */
  /****************************************************************************/
  // ### exposed_find_in_page
  //
  // Triggers the MODE_FIND_IN_PAGE
  // ```
  // @src  {string} source module
  // @args {}
  // @cb_  {function(err, res)}
  // ```
  exposed_find_in_page = function(src, args, cb_) {
    my.mode = my.MODE_FIND_IN_PAGE;
    socket_push();
  };

  // ### exposed_filter_tabs
  //
  // Triggers the MODE_FILTER_TABS
  // ```
  // @src  {string} source module
  // @args {}
  // @cb_  {function(err, res)}
  // ```
  exposed_filter_tabs = function(src, args, cb_) {
    my.mode = my.MODE_FILTER_TABS;
    socket_push();
  };

  // ### exposed_focus
  // 
  // Focuses the input (useful as the box module is embedded in an iframe)
  // ```
  // @src  {string} source module
  // @args {}
  // @cb_  {function(err, res)}
  // ```
  exposed_focus = function(src, args, cb_) {
    my.sockets.forEach(function(s) {
      s.emit('focus');
    });
  };

  // ### exposed_select_all
  // 
  // Select all the content of the input
  // ```
  // @src  {string} source module
  // @args {}
  // @cb_  {function(err, res)}
  // ```
  exposed_select_all = function(src, args, cb_) {
    my.sockets.forEach(function(s) {
      s.emit('select_all');
    });
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
    socket.on('submit', socket_submit);
    socket.on('input', socket_input);
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
    breach.module('core').on('tabs:state', core_state_handler);

    breach.expose('box_find_in_page', exposed_find_in_page);
    breach.expose('box_filter_tabs', exposed_filter_tabs);
    breach.expose('box_focus', exposed_focus);
    breach.expose('box_select_all', exposed_select_all);

    async.parallel([
    ], cb_);
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    return cb_();
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  common.method(that, 'handshake', handshake, _super);

  return that;
};

exports.box = box;
