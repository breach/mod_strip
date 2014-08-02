/*
 * Breach: [mod_strip] strip.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-16 spolu  Tabs filtering
 * - 2014-06-16 spolu  Removed action_next/prev towards tabs filtering
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

  my.tabs_state = null;
  my.filter = null;
  my.lock_filter = false;

  my.breach_update = false;
  my.module_update = false;

  my.bars = [];

  //
  // ### _public_
  //
  var handshake;                    /* handshake(socket) */
  var init;                         /* init(cb_); */
  var kill;                         /* kill(cb_); */

  var addBar;

  //
  // ### _private_
  //
  var filter_state;                 /* filter_state(); */
  var socket_push;                  /* socket_push(); */

  var socket_select;                /* socket_select(name); */
  var socket_close;                 /* socket_close(name); */
  var socket_back;                  /* socket_back(); */
  var socket_forward;               /* socket_forward(); */
  var socket_new;                   /* socket_new(); */
  var socket_update;                /* socket_update(); */

  var box_load_url_handler;         /* box_load_url_handler(evt); */
  var box_input_handler;            /* box_input_handler(evt); */
  var core_module_update_ready;     /* core_module_update_ready(evt); */
  var core_breach_update_ready;     /* core_breach_update_ready(evt); */
  var core_module_state_change;     /* core_module_state_change(evt); */

  var shortcut_new;                 /* shortcut_new(); */
  var shortcut_next;                /* shortcut_next(); */
  var shortcut_prev;                /* shortcut_prev(); */
  var shortcut_close;               /* shortcut_close(); */
  var shortcut_recover;             /* shortcut_recover(); */
  var shortcut_back;                /* shortcut_back(); */
  var shortcut_forward;             /* shortcut_forward(); */
  var shortcut_reload;              /* shortcut_reload(); */
  var shortcut_commit;              /* shortcut_commit(); */
  var shortcut_go;                  /* shortcut_go(); */
  var shortcut_clear;               /* shortcut_clear(); */
  var shortcut_select_by_index;     /* shortcut_select_by_index(); */

  //
  // ### _that_
  //
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### filter_state
  //
  // Returns the state with filtered tabs by `my.filter`
  filter_state = function() {
    var active_tab_id = null;
    if(my.tabs_state.tabs && my.tabs_state.tabs[my.tabs_state.active]) {
      active_tab_id = my.tabs_state.tabs[my.tabs_state.active].tab_id;
    }
    var state = {
      active: -1,
      tabs: [],
      bars: [],
      breach_update: my.breach_update,
      module_update: my.module_update
    };
    if(my.tabs_state.tabs) {
      var index = 0;
      state.tabs = my.tabs_state.tabs.filter(function(t) {
        if(!my.filter ||
           my.filter.test(t.title) ||
           my.filter.test(t.url)) {
          if(t.tab_id === active_tab_id) {
            state.active = index;
          }
          index++;
          return true;
        }
        return false;
      });
    }
    if(my.bars) {
        state.bars = my.bars;
    }
    return state;
  };


  // ### socket_push
  //
  // Pushes the current state on the UI socket
  // ```
  // @state {object} the tabs state
  // ```
  socket_push = function() {
    //console.log(update);
    my.sockets.forEach(function(s) {
      s.emit('state', filter_state());
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
    common._.tabs.action_new(function() {
      setTimeout(shortcut_go, 75);
    });
  };

  // ### socket_update
  //
  // Received when the update button is pushed
  socket_update = function() {
    common._.tabs.action_new(function() {
      setTimeout(function() {
        common._.tabs.action_load('breach://modules');
      }, 75);
    });
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
    if(my.filter !== null) {
      my.lock_filter = false;
      my.filter = null;
      socket_push();
    }
  };

  // ### box_input_handler
  //
  // Handler called when the box receives user inputs
  // ```
  // @evt {object} { value }
  // ```
  box_input_handler = function(evt) {
    if(evt.mode === 1 << 0 && 
       evt.value && evt.value.length > 0) {
      try {
        my.filter = new RegExp(evt.value.toLowerCase(), 'i');
      } catch(err) {}
      socket_push();
    }
    else if(!my.lock_filter && my.filter !== null) {
      my.filter = null;
      socket_push();
    }
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS */
  /****************************************************************************/
  // ### core_module_update_ready
  //
  // Handler called when a module update is ready to be installed
  // ```
  // @evt {object}
  // ```
  core_module_update_ready = function(evt) {
    my.module_update = true;
    socket_push();
  };

  // ### core_breach_update_ready
  //
  // Handler called when a breach update is ready to be installed
  // ```
  // @evt {object}
  // ```
  core_breach_update_ready = function(evt) {
    my.breach_update = true;
    socket_push();
  };

  // ### core_module_state_change
  //
  // Handler called whenever a module state changes. We update the update state.
  // ```
  // @evt {object}
  // ```
  core_module_state_change = function(evt) {
    /* Async retrieval of update state. */
    breach.module('core').call('auto_update_state', {}, function(err, state) {
      if(err) {
        common.log.error(err)
        return;
      }
      my.breach_update = state.breach.update_ready;
      if(state.modules.length > 0) {
        my.module_update = true;
      }
      else {
        my.module_update = false;
      }
      socket_push();
    });
  };

  /****************************************************************************/
  /* KEYBOARD SHORTCUTS EVENT HANDLERS */
  /****************************************************************************/
  // ### shortcut_new
  //
  // Keyboard shortcut to create a new tab
  shortcut_new = function() {
    common._.tabs.action_new(function() {
      setTimeout(shortcut_go, 75);
    });
  };

  // ### shortcut_next
  //
  // Keyboard shortcut to select next tab
  shortcut_next = function() {
    my.lock_filter = true;
    var state = filter_state();
    if(state.tabs.length > 0) {
      var active = state.active + 1;
      if(active >= state.tabs.length) {
        active = 0;
      }
      common._.tabs.action_select(state.tabs[active].tab_id);
    }
  };

  // ### shortcut_prev
  //
  // Keyboard shortcut to select prev tab
  shortcut_prev = function() {
    my.lock_filter = true;
    var state = filter_state();
    if(state.tabs.length > 0) {
      var active = state.active - 1;
      if(active < 0) {
        active = state.tabs.length - 1;
      }
      common._.tabs.action_select(state.tabs[active].tab_id);
    }
  };

  // ### shortcut_close
  //
  // Keyboard shortcut to close current Tab
  shortcut_close = function() {
    common._.tabs.action_close();
  };

  // ### shortcut_recover
  //
  // Keyboard shortcut to recover closed current Tabs
  shortcut_recover = function() {
    common._.tabs.action_recover();
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

  // ### shortcut_commit
  //
  // Keyboard shortcut to select prev tab
  shortcut_commit = function() {
    my.lock_filter = false;
    common._.tabs.action_commit();
    if(my.filter !== null) {
      my.lock_filter = false;
      my.filter = null;
      socket_push();
    }
  };


  // ### shortcut_go
  //
  // Keyboard shortcut to select the box
  shortcut_go = function() {
    breach.module('mod_strip').call('box_select_all');
  };

  // ### shortcut_clear
  //
  // Keyboard shortcut to clear filters (ESC key pressed)
  shortcut_clear = function () {
    if(my.filter !== null) {
      my.lock_filter = false;
      my.filter = null;
      socket_push();
    }
  };

  // ### shortcut_select_by_index
  //
  // Keyboard shortcut to select a specific tab, based on its index, not on the tab id
  // ```
  // @tab_index {number} the tab index [0-9]
  // ```
  shortcut_select_by_index = function(tab_index) {
    my.lock_filter = true;
    var state = filter_state();
    if(tab_index >= 0 && tab_index < state.tabs.length) {
      common._.tabs.action_select(state.tabs[tab_index].tab_id);
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
    common.log.out('[strip] HANDSHAKE');
    my.sockets.unshift(socket);

    socket.on('select', socket_select);
    socket.on('close', socket_close);
    socket.on('back', socket_back);
    socket.on('forward', socket_forward);
    socket.on('new', socket_new);
    socket.on('update', socket_update);

    my.tabs_state = common._.tabs.state();
    socket_push();

    socket.on('disconnect', function() {
      common.log.out('[strip] disconnect');
      common.remove(my.sockets, socket, true);
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
        my.keyboard_shortcuts.on('recover', shortcut_recover);
        my.keyboard_shortcuts.on('back', shortcut_back);
        my.keyboard_shortcuts.on('forward', shortcut_forward);
        my.keyboard_shortcuts.on('reload', shortcut_reload);
        my.keyboard_shortcuts.on('commit', shortcut_commit);
        my.keyboard_shortcuts.on('go', shortcut_go);
        my.keyboard_shortcuts.on('clear', shortcut_clear);
        my.keyboard_shortcuts.on('select_by_index', shortcut_select_by_index);

        common._.tabs.on('state', function(state) {
          my.tabs_state = state;
          socket_push();
        });

        /* We listen to ourselves as the box object sends event publicly. */
        breach.module('mod_strip').on('box_load_url', box_load_url_handler);
        breach.module('mod_strip').on('box_input', box_input_handler);
        /* We also listen to auto_update events. */
        breach.module('core').on('auto_update:module_update_ready', 
                                 core_module_update_ready);
        breach.module('core').on('auto_update:breach_update_ready',
                                 core_breach_update_ready);
        breach.module('core').on('modules:state_change',
                                 core_module_state_change);

        core_module_state_change();
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

  addBar = function(args, cb_) {
      var height = args.dimension;
      console.log('strip adding bar ' + args.url + ' ' + height);

      var found = false;
      my.bars.forEach(function(b) {
          if (b.id === args.id) {
            found = true;
          }
      });
      if(found) return cb_();

      my.bars.push(args);
      socket_push();
      var total_height = 45;
      my.bars.forEach(function(b) {
          total_height += b.dimension;
      });
      async.series([
          function(cb_) {
              breach.module('core').call('controls_dimension', {
                  type: 'TOP',
                  dimension: total_height
              }, cb_);
          }
      ], cb_);
  }


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);
  common.method(that, 'addBar', addBar, _super);

  common.method(that, 'handshake', handshake, _super);

  return that;
};

exports.strip = strip;

