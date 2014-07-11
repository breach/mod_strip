/*
 * Breach [mod_strip] keyboard_shortcuts.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu  Move to `mod_layout` module
 * - 2014-01-23 spolu  Move to mod_stack module
 * - 2013-10-23 spolu  More complete/conventional set of shortcuts
 * - 2013-09-06 spolu  Fix #60 Added "recover-page"
 * - 2013-08-22 spolu  Creation
 */
var common = require('./common.js');

var events = require('events');
var async = require('async');
var breach = require('breach_module');

// ## keyboard_shortcuts
//
// Handles keyboard events coming globally, perform some analysis (release
// order, modifier release), and emit shortcut events.
// 
// ```
// @spec { }
// ```
var keyboard_shortcuts = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  my.last = null;
  my.can_commit = false;

  //
  // ### _public_
  //
  var init;                      /* init(cb_); */
  var kill;                      /* kill(cb_); */

  //
  // #### _private_
  // 
  var is_last;                   /* is_last(event); */
  var handler;                   /* handler(evt); */

  //
  // #### that
  //
  var that = new events.EventEmitter();

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/
  // ### is_last
  //
  // Computes whether it is the same event as last event
  // ```
  // @event {object} the event to compare to `last`
  // ```
  is_last = function(event) {
    if(my.last &&
       my.last.type === event.type &&
       my.last.modifiers === event.modifiers &&
       my.last.keycode === event.keycode) {
      return true;
    }
    return false;
  };

  // ### handler
  // 
  // Handles the session exo_browser `frame_keyboard` event
  //
  // Events: 
  // - `type`:
  //  `` RawKeyDown = 7 ``
  //  `` KeyUp      = 9 ``
  //
  // - `modifier`:
  //  `` ShiftKey   = 1 << 0 ``
  //  `` ControlKey = 1 << 1 ``
  //  `` AltKey     = 1 << 2 ``
  //  `` MetaKey    = 1 << 3 ``
  //  `` IsLeft     = 1 << 11 ``
  //  `` IsRight    = 1 << 12 ``
  // ```
  // @event {object} keyboard event
  // ```
  handler = function(evt) {
    var modifier = (1 << 1); /* ctrl */
    var modifier_key = 17;
    if(process.platform === 'darwin') {
      modifier = (1 << 3); /* command */
      modifier_key = 91;
    }
    /* Use for ctrl shortcut on darwin. */
    var ctrl = (1 << 1); /* ctrl */
    var ctrl_key = 17;

    //common.log.out(JSON.stringify(evt));

    if(evt.type === 7 && (evt.modifiers === modifier) &&
       evt.keycode === 84) {
      /* Ctrl - T ; Repetition OK */
      that.emit('new');
    }
    if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
       evt.keycode === 84 && !is_last(evt)) {
      /* Ctrl - Shift - T ; No Repetition */
      that.emit('recover');
    }

    if(evt.type === 7 && (evt.modifiers === modifier) &&
       (evt.keycode === 76 || evt.keycode === 32) && !is_last(evt)) {
      /* Ctrl - L | Space ; No Repetition */
      that.emit('go');
    }

    if(evt.type === 7 && (evt.modifiers === modifier) &&
       (evt.keycode === 74 || evt.keycode === 40)) {
      /* Ctrl - J | Down ; Repetition OK */
      that.emit('next');
      my.can_commit = true;
    }
    if(evt.type === 7 && (evt.modifiers === modifier) &&
       (evt.keycode === 75 || evt.keycode === 38)) {
      /* Ctrl - K | Up ; Repetition OK */
      that.emit('prev');
      my.can_commit = true;
    }
    if(evt.type === 9 && (evt.modifiers === ctrl) && 
       (evt.keycode === 9)) {
      /* Ctrl - Tab ; Repetition OK */
      that.emit('next');
      my.can_commit = true;
    }
    if(evt.type === 7 && (evt.modifiers === (1 << 0 | ctrl)) &&
       (evt.keycode === 9)) {
      /* Ctrl - Shift - Tab ; Repetition OK */
      that.emit('prev');
      my.can_commit = true;
    }
    if(evt.type === 7 && (evt.modifiers === modifier) &&
      (evt.keycode >= 49 && evt.keycode <= 57)) {
      /* Ctrl - 1-9 ; Repetiton OK */
      that.emit('select_by_index', evt.keycode - 49);
      my.can_commit = true;
    }

    if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
       evt.keycode === 74 && !is_last(evt)) {
      /* Ctrl - Shift - J ; No Repetition */
      that.emit('back');
    }
    if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
       evt.keycode === 75 && !is_last(evt)) {
      /* Ctrl - Shift - K ; No Repetition */
      that.emit('forward');
    }
    if(evt.type === 7 && (evt.modifiers === modifier) &&
       evt.keycode === 37 && !is_last(evt)) {
      /* Ctrl - Left ; No Repetition */
      that.emit('back');
    }
    if(evt.type === 7 && (evt.modifiers === modifier) &&
       evt.keycode === 39 && !is_last(evt)) {
      /* Ctrl - Right ; No Repetition */
      that.emit('forward');
    }

    if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
       evt.keycode === 72 && !is_last(evt)) {
      /* Ctrl - Shift - H ; No Repetition */
      that.emit('toggle');
    }

    if(evt.type === 9 && 
       (evt.keycode === modifier_key ||
        evt.keycode === ctrl_key)) {
      /* Ctrl (Release); No Repetition */
      if(my.can_commit) {
        my.can_commit = false;
        that.emit('commit');
      }
    }
    /* CapsLock as a Ctrl case */
    if(evt.type === 9 && (evt.modifiers === modifier) &&
       evt.keycode === 20) {
      /* Ctrl (Release); No Repetition */
      if(my.can_commit) {
        my.can_commit = false;
        that.emit('commit');
      }
    }

    if(evt.type === 7 && (evt.modifiers === modifier) && 
       evt.keycode === 87) {
      /* Ctrl - W ; Repetition OK */
      that.emit('close');
    }

    if(evt.type === 7 && (evt.modifiers === modifier) && 
       evt.keycode === 80 && !is_last(evt)) {
      /* Ctrl - W ; No Repetition */
      that.emit('stack_pin');
    }
      
    if(evt.type === 7 && (evt.modifiers === modifier) && 
       evt.keycode === 70 && !is_last(evt)) {
      /* Ctrl - F ; No Repetition */
      that.emit('find_in_page');
    }
    if(evt.type === 7 && (evt.modifiers === modifier) && 
       evt.keycode === 82 && !is_last(evt)) {
      /* Ctrl - R ; No Repetition */
      that.emit('reload');
    }

    if(evt.type === 7 && evt.keycode === 27) {
      /* ESC ; Repetition OK */
      that.emit('clear');
    }

    if(process.platform === 'darwin') {

      if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
         evt.keycode === 221) {
        /* Ctrl - } ; Repetition OK */
        that.emit('next');
        my.can_commit = true;
      }
      if(evt.type === 7 && (evt.modifiers === (1 << 0 | modifier)) &&
         evt.keycode === 219) {
        /* Ctrl - { ; Repetition OK */
        that.emit('prev');
        my.can_commit = true;
      }
    }

    my.last = evt;
  };

  /****************************************************************************/
  /* PUBLIC METHODS */
  /****************************************************************************/
  // ### init 
  //
  // Called at initialisation of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  init = function(cb_) {
    breach.module('core').on('tabs:keyboard', handler);
    breach.module('core').on('controls:keyboard', handler);
    return cb_();
  };

  // ### kill 
  //
  // Called at destruction of the module
  // ```
  // @cb_  {function(err)} the async callback
  // ```
  kill = function(cb_) {
    //console.log('KILL');
    return cb_();
  };


  common.method(that, 'init', init, _super);
  common.method(that, 'kill', kill, _super);

  return that;
};

exports.keyboard_shortcuts = keyboard_shortcuts;

