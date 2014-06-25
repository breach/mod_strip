/*
 * Breach: [mod_layout] tabs.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-24 spolu  Make sure a new tab is always visible
 * - 2014-06-16 spolu  Removed action_next/prev towards tabs filtering
 * - 2014-06-04 spolu  Move to shared `tabs.js` in `mod_layout`
 * - 2014-05-20 spolu  Integration with `core_store`
 * - 2014-04-18 spolu  Removed `new_tab` from `mod_stack`
 * - 2014-01-22 spolu  Creation
 */
"use strict"

var common = require('./common.js');

var events = require('events');
var http = require('http');
var async = require('async');
var breach = require('breach_module');

// ### tabs
//
// ```
// @emits `state`
// @spec { http_port }
// ```
var tabs = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  /* `core_tabs` is a dictionary reprensenting the currently opened tabs: */
  /*  core_tabs[tab_id] = {                                               */
  /*    load: 0,                                                          */
  /*    tab_id: '...',                                                    */
  /*    state: { ... }  // full core state                                */
  /*  }                                                                   */
  /* Such entry exists only if the tab with `internal_id` is not of type  */
  /* `new_tab`.                                                           */
  my.core_tabs = {};
  /* `new_tab` tracks the state of the `new_tab` tab. */
  my.new_tab = {
    tab_id: null,
    state: null
  };

  /* `last` is the latest known value for the tabs state. */
  my.last = {
    active: -1,
    tabs: [],
    recover: []
  };
  my.last_active = null;

  my.internal_id_nonce;

  //
  // ### _public_
  //
  var action_new;                   /* action_new(); */
  var action_commit;                /* action_commit(); */
  var action_close;                 /* action_close(); */
  var action_back;                  /* action_back(); */
  var action_forward;               /* action_forward(); */
  var action_reload;                /* action_reload(); */
  var action_recover;               /* action_recover(); */
  var action_select;                /* action_select(tab_id); */
  var action_load;                  /* action_load(url); */

  var init;                         /* init(cb_); */
  var kill;                         /* kill(cb_); */
  var state;                        /* state(); */

  //
  // ### _private_
  //
  var tabs_reducer;                 /* tabs_reducer(oplog); */

  var next_tab_id;                  /* next_tab_id(); */
  var url_for_state;                /* url_for_state(); */
  var host_for_state;               /* host_for_state(); */
  var title_for_state;              /* title_for_state(); */

  var push_payload;                 /* push_payload(payload); */
  var update_tabs;                  /* update_tabs(value); */

  var core_state_handler;           /* core_state_handler(evt); */
  var core_tabs_created_handler;    /* core_tabs_created_handler(evt); */
  var core_context_menu_handler;    /* core_context_menu_handler(evt); */
  var exposed_context_menu_builder; /* exposed_context_menu_builder(src, args, cb_); */

  //
  // ### _that_
  //
  var that = new events.EventEmitter();

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### tabs_reducer
  //
  // Reducer used with core_data to store tabs state
  // ```
  // @oplog {array} the array of ops to reduce
  // ```
  tabs_reducer = function(oplog) {
    /* Returns a state object inluding currently opened tabs, recover list */
    var value = {
      active: -1,
      tabs: [],
      recover: []
    };
    oplog.forEach(function(op) {
      if(typeof op.value !== 'undefined') {
        value = op.value || {
          active: -1,
          tabs: [],
          recover: []
        };
      }
      else if(op.payload) {
        switch(op.payload.type) {
          case 'new': {
            if(op.payload.disposition === 'new_tab') {
              value.tabs.splice(0, 0, {
                type: 'new_tab',
                tab_id: op.payload.tab_id
              });
              value.active = 0;
            }
            else if(op.payload.disposition === 'new_foreground_tab') {
              value.tabs.splice(0, 0, {
                type: 'regular',
                url: op.payload.url,
                tab_id: op.payload.tab_id,
                load: 1
              });
              value.active = 0;
            }
            else if(op.payload.disposition === 'new_background_tab') {
              value.tabs.splice(Math.min(1, value.tabs.length), 0, {
                type: 'regular',
                url: op.payload.url,
                tab_id: op.payload.tab_id,
                load: 1
              });
              if(value.active === -1) {
                value.active = 0;
              }
            }
            break;
          }
          case 'select': {
            value.tabs.forEach(function(t, i) {
              if(t.tab_id === op.payload.tab_id) {
                value.active = i;
              }
            });
            break;
          }
          case 'commit': {
            if(value.tabs.length > 0) {
              var tab = value.tabs.splice(value.active, 1)[0];
              value.tabs.splice(0, 0, tab);
              value.active = 0;
            }
            break;
          }
          case 'close': {
            var c = null;
            if(value.tabs.length > 0) {
              if(op.payload.tab_id) {
                value.tabs.forEach(function(t, i) {
                  if(t.tab_id === op.payload.tab_id) {
                    c = value.tabs.splice(i, 1)[0]
                  }
                });
              }
              else {
                c = value.tabs.splice(value.active, 1)[0]
              }
              if(c) {
                value.recover.push(c);
                while(value.recover.length > 10) {
                  value.recover.shift();
                }
              }
              if(value.active === value.tabs.length) value.active--;
              if(value.tabs.length === 0) {
                value.tabs.splice(0, 0, {
                  type: 'new_tab',
                  tab_id: op.payload.next_tab_id
                });
                value.active = 0;
              }
            }
            break;
          }
          case 'recover': {
            if(value.recover.length > 0) {
              value.tabs.splice(0, 0, value.recover.pop());
              value.active = 0;
              break;
            }
          }
          case 'state': {
            value.tabs.forEach(function(t) {
              if(op.payload.tab_id === t.tab_id && t.type != 'new_tab') {
                t.title = op.payload.title;
                if(t.url !== op.payload.url) {
                  t.url = op.payload.url;
                }
              }
            });
            break;
          }
          case 'load': {
            value.tabs.forEach(function(t) {
              if(op.payload.tab_id === t.tab_id) {
                t.url = op.payload.url;
                t.type = 'regular';
                t.load = (t.load || 0) + 1;
              }
            });
            break;
          }
          default: {
            break;
          }
        }
      }
    });
    return value;
  };

  // ### next_tab_id
  //
  // Returns a new hopefully globally unique tab_id
  next_tab_id = function() {
    return common.hash([Date.now() + '-' + (++my.internal_id_nonce)]);
  };

  // ### url_for_state
  //
  // Retrieves the current url for the provided state (return the url href)
  // ```
  // @state {object} state as retrieved by core_state_handler
  // ```
  url_for_state = function(state) {
    var url = null;
    state.entries.forEach(function(n) {
      if(n.visible) {
        url = n.url.href;
      }
    });
    return url;
  };

  // ### title_for_state
  //
  // Retrieves the current title for the provided state
  // ```
  // @state {object} state as retrieved by core_state_handler
  // ```
  title_for_state = function(state) {
    var title = null;
    state.entries.forEach(function(n) {
      if(n.visible) {
        title = n.title;
      }
    });
    return title;
  };


  // ### push_payload
  //
  // Pushes a payload on `core_store` and calls `update_tabs`
  // ```
  // @payload {object} a payload object
  // @cb_     {function(err, value)} [optional]
  // ```
  push_payload = function(payload, cb_) {
    breach.module('core').call('store_push', {
      type: 'tabs',
      path: '/tabs',
      payload: payload
    }, function(err, value) {
      if(err) {
        if(cb_) return cb_(err);
        common.log.error(err);
      }
      else {
        update_tabs(value);
        if(cb_) return cb_(err, value);
      }
    });
  };

  // ### update_tabs
  //
  // Called whenever an updated value is retrieved from core_state
  // ```
  // @value {object} the tabs reduced value
  // ```
  update_tabs = function(value) {
    my.last = value;

    var tabs = {};
    /* Open tabs that are not yet available. */
    my.last.tabs.forEach(function(t, i) {
      tabs[t.tab_id] = t;
      if(t.type === 'new_tab') {
        /* NOP. */
      }
      else if(!my.core_tabs[t.tab_id]) {
        //console.log('OPENING: ' + t.tab_id + ' ' + t.url);
        var active = my.last.active === i;
        breach.module('core').call('tabs_new', { 
          visible: active,
          focus: active,
          url: t.url,
          id: t.tab_id
        }, function(err, res) {
          if(err) {
            common.log.error(err);
          }
        });
      }
      else {
        /* We update the tab url only if this was a load requested by the */
        /* that we didn't see already (using the load counter).           */
        if(url_for_state(my.core_tabs[t.tab_id].state) !== t.url &&
           my.core_tabs[t.tab_id].last_load < t.load) {
          my.core_tabs[t.tab_id].last_load = t.load;
          breach.module('core').call('tabs_load_url', { 
            url: t.url,
            id: t.tab_id
          });
        }
      }
    });

    /* Close tabs if necessary. */
    Object.keys(my.core_tabs).forEach(function(tab_id) {
      if(!tabs[tab_id] && tab_id !== my.new_tab.tab_id) {
        //console.log('CLOSING: ' + tab_id);
        breach.module('core').call('tabs_close', {
          id: tab_id
        });
        delete my.core_tabs[tab_id];
      }
    });
    
    /* Show active tab if updated. */
    var tab = my.last.tabs[my.last.active];
    var active = null;
    if(tab) {
      if(tab.type === 'new_tab') {
        active = my.new_tab.tab_id;
      }
      else {
        active = tab.tab_id;
      }
      breach.module('core').call('set_title', {
        title: tab.title,
      });
    }
    if(my.last_active !== active) {
      my.last_active = active;
      breach.module('core').call('tabs_show', {
        id: active,
        focus: true
      });
    }
    //console.log('UPDATE STACK');
    //console.log(JSON.stringify(that.state(), null, 2));
    that.emit('state', that.state());
  };

  /****************************************************************************/
  /* CORE EVENT HANDLERS AND EXPOSED RPC */
  /****************************************************************************/
  // ### core_state_handler
  //
  // Handler called when the state is updated by the core module
  // ```
  // @state {object} the state
  // ```
  core_state_handler = function(state) {
    Object.keys(state).forEach(function(tab_id) {
      /* Intercept the `new_tab` state. */
      if(tab_id === my.new_tab.tab_id) {
        my.new_tab.state = state[tab_id];
        return;
      }

      /* Maintain my.core_tabs up to date. */
      if(!my.core_tabs[tab_id]) {
        my.core_tabs[tab_id] = {
          state: state[tab_id],
          tab_id: tab_id,
          last_load: 0
        };
        breach.module('core').call('tabs_set_context_menu_builder', {
          id: tab_id,
          procedure: 'context_menu_builder'
        });
      }
      else {
        my.core_tabs[tab_id].state = state[tab_id];
      }

      /* Update know tab state. */
      var tab = null;
      my.last.tabs.forEach(function(t) {
        if(t.tab_id === tab_id) {
          tab = t;
        }
      });
      if(tab && (tab.url !== url_for_state(state[tab_id]) ||
                 tab.title !== title_for_state(state[tab_id]))) {
        push_payload({
          type: 'state',
          tab_id: tab_id,
          title: title_for_state(state[tab_id]),
          url: url_for_state(state[tab_id])
        });
      }
    });
    /* DEBUG */ common.log.debug(JSON.stringify(my.core_tabs, null, 2));
    that.emit('state', that.state());
  };

  // ### core_tabs_crated_handler
  //
  // Handler called when a new tab is created by the user actions
  // ```
  // @state {object} the state
  // ```
  core_tabs_created_handler = function(evt) {
    var tab_id = evt.id;
    var disposition = evt.disposition;
    push_payload({
      type: 'new',
      disposition: evt.disposition,
      url: null,
      tab_id: evt.id
    });
  };

  // ### core_context_menu_handler
  //
  // Hanlder called when a context menu item is triggered
  // ```
  // @evt { src, id, item } the context menu item information
  // ```
  core_context_menu_handler = function(evt) {
    if(evt.src === 'mod_layout') {
      switch(evt.item) {
        case 'Close DevTools': {
          breach.emit('devtools', { devtools_url: null });
          break;
        }
        case 'Inspect Element': {
          breach.module('core').call('tabs_devtools', {
            id: evt.id,
            element_at: {
              x: my.context_menu_params.x,
              y: my.context_menu_params.y
            }
          }, function(err, res) {
            if(err) {
              return;
            }
            var dev_id = res.id;
            var url_p = require('url').parse(res.url);
            var json_url = 'http://' + url_p.hostname + ':' + url_p.port +
                           '/json/list';
            http.get(json_url, function(res) {
              res.setEncoding('utf8');
              var data = '';
              res.on('data', function(chunk) {
                data += chunk;
              });
              res.on('end', function() {
                try {
                  JSON.parse(data).forEach(function(dev) {
                    if(dev.id === dev_id) {
                      var url = 'http://' + url_p.hostname + ':' + url_p.port +
                                dev.devtoolsFrontendUrl;
                      console.log('DEVTOOLS: ' + url);
                      breach.emit('devtools', { devtools_url: url });
                    }
                  });
                }
                catch(err) { /* NOP */ }
              });
            }).on('error', function(err) { /* NOP */ });
          });
          break;
        }
        case 'Reload': {
          breach.module('core').call('tabs_reload', {
            id: evt.id
          });
          break;
        }
        case 'Back': {
          breach.module('core').call('tabs_back_or_forward', {
            offset: -1,
            id: evt.id
          });
          break;
        }
        case 'Forward': {
          breach.module('core').call('tabs_back_or_forward', {
            offset: 1,
            id: evt.id
          });
          break;
        }
      }
    }
  };

  // ### exposed_context_menu_builder
  //
  // Procedure called when the context menu for registered tabs needs to be
  // built
  // ```
  // @src  {string} source module
  // @args { id, params }
  // @cb_  {function(err, res)}
  // ```
  exposed_context_menu_builder = function(src, args, cb_) {
    /* We store the context_menu params to use it on trigger (position for */
    /* inspect element in particular. */
    my.context_menu_params = args.params;

    var items = [
      'Reload',
      null,
      'Inspect Element',
      'Close DevTools'
    ];

    var state = null;
    if(args.id === my.new_tab.tab_id) {
      state = my.new_tab.state;
    }
    else if(my.core_tabs[args.id]) {
      state = my.core_tabs[args.id];
    }
    if(state) {
      if(state.can_go_forward) {
        items.splice(0, 0, 'Forward');
      }
      if(state.can_go_back) {
        items.splice(0, 0, 'Back');
      }
    }
    return cb_(null, {
      items: items
    })
  };

  /****************************************************************************/
  /* ACTIONS EXPOSED */
  /****************************************************************************/
  // ### action_new
  //
  // Public action to create a new tab
  action_new = function(cb_) {
    push_payload({
      type: 'new',
      disposition: 'new_tab',
      tab_id: next_tab_id()
    }, cb_);
  };

  // ### action_commit
  //
  // Public action emitted when a navigation is committed (keys released in the 
  // case of `stack`)
  action_commit = function() {
    push_payload({
      type: 'commit'
    });
  };

  // ### action_close
  //
  // Public action to close current Tab
  // ```
  // @tab_id {string} the tab_id to select [optional]
  // ```
  action_close = function(tab_id) {
    push_payload({
      type: 'close',
      tab_id: tab_id,
      next_tab_id: next_tab_id()
    });
  };

  // ### action_back
  //
  // Public action to go back the current tab
  action_back = function() {
    if(my.last.tabs.length > 0) {
      var tab_id = (my.last.tabs[my.last.active].type === 'new_tab') ?
        my.new_tab.tab_id : my.last.tabs[my.last.active].tab_id;
      breach.module('core').call('tabs_back_or_forward', {
        offset: -1,
        id: tab_id
      });
    }
  };

  // ### action_forward
  //
  // Public action to go forward the current tab
  action_forward = function() {
    if(my.last.tabs.length > 0) {
      var tab_id = (my.last.tabs[my.last.active].type === 'new_tab') ?
        my.new_tab.tab_id : my.last.tabs[my.last.active].tab_id;
      breach.module('core').call('tabs_back_or_forward', {
        offset: 1,
        id: tab_id
      });
    }
  };

  // ### action_reload
  //
  // Public action to reload current tab
  action_reload = function() {
    if(my.last.tabs.length > 0) {
      var tab_id = (my.last.tabs[my.last.active].type === 'new_tab') ?
        my.new_tab.tab_id : my.last.tabs[my.last.active].tab_id;
      breach.module('core').call('tabs_reload', {
        id: tab_id
      });
    }
  };

  // ### action_recover
  //
  // Public action to select prev tab
  action_recover = function() {
    push_payload({
      type: 'recover'
    });
  };

  // ### action_select
  //
  // Public action to select prev tab
  // ```
  // @tab_id {string} the tab_id to select
  // ```
  action_select = function(tab_id) {
    push_payload({
      type: 'select',
      tab_id: tab_id
    });
  };

  // ### action_load
  //
  // Public action to load a given url for the currently active tab
  // ```
  // @url {string} the url to load
  // ```
  action_load = function(url) {
    if(my.last.tabs.length > 0) {
      var tab_id = my.last.tabs[my.last.active].tab_id;
      push_payload({
        type: 'load',
        tab_id: tab_id,
        url: url
      });
    }
  };


  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### state
  //
  // Returns the current state of the tabs
  state = function() {
    var state = {
      tabs: [],
      active: my.last.active
    };
    my.last.tabs.forEach(function(t) {
      if(my.core_tabs[t.tab_id] && my.core_tabs[t.tab_id].state) {
        t.state = my.core_tabs[t.tab_id].state;
      }
      state.tabs.push(t);
    });
    return state;
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
        breach.expose('context_menu_builder', exposed_context_menu_builder);
        breach.module('core').on('tabs:context_menu', core_context_menu_handler);
        return cb_();
      },
      function(cb_) {
        /* Install the controls on the new tab. */
        my.new_tab.tab_id = '__NEW_TAB_ID__';
        breach.module('core').call('tabs_set_context_menu_builder', {
          id: '__NEW_TAB_ID__',
          procedure: 'context_menu_builder'
        });
        return cb_();
      },
      function(cb_) {
        breach.module('core').call('tabs_state', {}, function(err, state) {
          if(err) {
            return cb_(err);
          }
          core_state_handler(state);
          return cb_();
        });
      },
      function(cb_) {
        breach.module('core').on('tabs:state', core_state_handler);
        breach.module('core').on('tabs:created', core_tabs_created_handler);
        return cb_();
      },
      function(cb_) {
        breach.module('core').call('store_register', {
          type: 'tabs',
          reduce: tabs_reducer.toString()
        }, cb_);
      },
      function(cb_) {
        breach.module('core').call('store_get', {
          type: 'tabs',
          path: '/tabs'
        }, function(err, value) {
          if(err) {
            return cb_(err);
          }
          else {
            update_tabs(value);
            return cb_();
          }
        });
      }
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


  common.method(that, 'action_new', action_new, _super);
  common.method(that, 'action_commit', action_commit, _super);
  common.method(that, 'action_close', action_close, _super);
  common.method(that, 'action_back', action_back, _super);
  common.method(that, 'action_forward', action_forward, _super);
  common.method(that, 'action_reload', action_reload, _super);
  common.method(that, 'action_recover', action_recover, _super);
  common.method(that, 'action_select', action_select, _super);
  common.method(that, 'action_load', action_load, _super);

  common.method(that, 'state', state, _super);
  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  return that;
};

exports.tabs = tabs;
