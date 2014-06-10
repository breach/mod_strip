/*
 * Breach: [mod_layout] strip_d.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-04 spolu  Forked from `mod_stack`
 * - 2014-05-21 spolu  New state format (tabs on core_state)
 * - 2013-08-15 spolu  Creation
 */
'use strict'

//
// ### StripCtrl
// `strip` directive controller
//
angular.module('breach.directives').controller('StripCtrl',
  function($scope, $element, _socket) {

    var cthief = new ColorThief();

    /**************************************************************************/
    /* TAB MANIPULATION */
    /**************************************************************************/
    var TAB_WIDTH = 170;
    var TAB_MARGIN = 0;

    /**************************************************************************/
    /* TAB MANIPULATION */
    /**************************************************************************/
    /* Dictionary of tabs div elements. */
    var tabs_divs = {};

    /* Handy divs */
    var wrapper_div = $($element).find('.wrapper');
    var tabs_div = $($element).find('.tabs');

    // ### create_tab
    //
    // Creates a new tab div element with the specified id
    // ```
    // @tab_id {string} the id of the tab
    // ```
    var create_tab = function(tab_id) {
      var tab = $('<div/>')
        .addClass('tab')
        .click(function() {
          $scope.select_tab(tab_id);
        })
        .append($('<div/>')
          .addClass('separator'))
        .append($('<div/>')
          .addClass('border-bottom'))
        .append($('<div/>')
          .addClass('favicon'))
        .append($('<div/>')
          .addClass('content')
          .append($('<div/>')
            .addClass('shadow'))
          .append($('<div/>')
            .addClass('title')))
        .append($('<div/>')
          .addClass('close')
          .click(function() {
            $scope.close_tab(tab_id);
          })
          .append($('<div/>')
            .addClass('icon-iconfont-01')));
      return tab;
    };

    // ### update_tab
    //
    // Updates the tab with the specified id with the newly received state
    // ```
    // @tab_id {string} the tab id
    // @data   {object} tab data and state received
    // ```
    var update_tab = function(tab_id, tab_data) {
      var tab = tabs_divs[tab_id];
      tab.removeClass('active');
      var data = {
        title: '',
        url: { hostname: '', href: '' },
        favicon: '',
        loading: true
      };
      if(tab_data.type === 'new_tab') {
        data.title = 'New Tab';
        data.url = 'toto';
      }
      else {
        data.title = tab_data.title;
        data.url = tab_data.url || '';
        if(tab_data.state) {
          /* TODO(spolu): Keep old title as long as possible? */
          if(tab_data.state.loading && !data.title) {
            data.title = 'Loading...';
          }
          tab_data.state.entries.forEach(function(n) {
            if(n.visible) {
              if(n.favicon) {
                data.favicon = n.favicon;
              }
            }
          });
          data.loading = tab_data.state.loading;
        }
      }
      //console.log(JSON.stringify(data, null, 2));
      tab.find('.title').text(data.title);
      if($scope.active === tab_id)
        tab.addClass('active');
      if(data.favicon && data.favicon.length > 0) {
        var favicon_sha = SHA1(data.favicon);
        var favicon_div = tab.find('.favicon');
        var content_div = tab.find('.content');
        if(favicon_sha !== favicon_div.attr('favicon_sha')) {
          favicon_div.css('display', 'block');
          content_div.addClass('with-favicon');
          favicon_div.css('background-image', 
                          'url(' + data.favicon + ')');
          favicon_div.attr('favicon_sha', favicon_sha);
          favicon_div.attr('favicon_host', data.url.hostname);
        }
      }
      else {
        var favicon_sha = SHA1('');
        var favicon_div = tab.find('.favicon');
        var content_div = tab.find('.content');
        if(favicon_div.attr('favicon_host') !== data.url.hostname &&
           favicon_sha !== favicon_div.attr('favicon_sha')) {
          favicon_div.css('display', 'none');
          content_div.removeClass('with-favicon');
          favicon_div.css('background-image', 
                          'none');
          favicon_div.attr('favicon_sha', favicon_sha);
          favicon_div.attr('favicon_host', data.url.hostname);
        }
      }
    };

    // ### position_tab
    //
    // Positions the tab given its index in the `state.tabs_order` array
    // ```
    // @tab_id {string} the tab id
    // @idx    {number} position
    // ```
    var position_tab = function(tab_id, idx) {
      var tab = tabs_divs[tab_id];
      tab.css('left', idx * (TAB_WIDTH + TAB_MARGIN));
      /* If this is the active tab, we make sure it is visible. */
      if($scope.active === tab_id) {
        var tabs_width = Object.keys(tabs_divs).length * (TAB_WIDTH + TAB_MARGIN);
        var tabs_left = tabs_div.position().left;

        if((idx + 1) * (TAB_WIDTH + TAB_MARGIN) + tabs_left > wrapper_div.width()) {
          tabs_div.css({ 
            'transition': 'left 0.2s',
            'left': (wrapper_div.width() - (idx + 1) * (TAB_WIDTH + TAB_MARGIN)) + 'px'
          });
        }
        else if(-tabs_left > idx * (TAB_WIDTH + TAB_MARGIN)) {
          tabs_div.css({ 
            'transition': 'left 0.2s',
            'left': (idx * (TAB_WIDTH + TAB_MARGIN)) + 'px'
          });
        }
      }
    };

    // ### position_new_tab
    var position_new_tab = function(tab_count) {
      $($element)
        .find('.tabs .new_tab')
        .css('left', tab_count * (TAB_WIDTH + TAB_MARGIN));
    };

    // ### remove_tab
    //
    // Removes a tab by id
    // ```
    // @tab_id {string} the tab id
    // ```
    var remove_tab = function(tab_id) {
      var tab = tabs_divs[tab_id];
      delete tabs_divs[tab_id];
      tab.remove();
    };

    // ### mousewheel_handler
    //
    // Handles the mousewheel events to scroll tabs
    // ```
    // @evt {object} the jquery event
    // ```
    var mousewheel_handler = function(evt) {
      var tabs_width = Object.keys(tabs_divs).length * (TAB_WIDTH + TAB_MARGIN);
      var tabs_left = tabs_div.position().left;

      var update = tabs_left + evt.originalEvent.wheelDeltaX;
      if(wrapper_div.width() - update > tabs_width) {
        update = wrapper_div.width() - tabs_width;
      }
      if(update > 0) {
        update = 0;
      }
      tabs_div.css({ 
        'transition': 'none',
        'left': (update) + 'px'
      });
    };

    wrapper_div.bind('mousewheel', mousewheel_handler);

    /**************************************************************************/
    /* ANGULAR INTEGRATION */
    /**************************************************************************/
    $scope.$watch('state', function(state) {
      if(state) {
        var tabs_data = {};
        var tabs_order = [];
        /* Create any missing tab. */
        state.tabs.forEach(function(t) {
          tabs_data[t.tab_id] = t;
          tabs_order.push(t.tab_id);
          if(!tabs_divs[t.tab_id]) {
            tabs_divs[t.tab_id] = create_tab(t.tab_id);
            $($element).find('.tabs').append(tabs_divs[t.tab_id]);
          }
        });
        /* Cleanup Closed tabs */
        Object.keys(tabs_divs).forEach(function(tab_id) {
          if(!tabs_data[tab_id]) {
            remove_tab(tab_id);
          }
        });

        $scope.active = tabs_order[state.active];
        
        /* Update tabs position. */
        tabs_order.forEach(position_tab);
        position_new_tab(tabs_order.length);

        /* Update tabs state. */
        tabs_order.forEach(function(tab_id) {
          update_tab(tab_id, tabs_data[tab_id]);
        });
      }
    });

    $scope.select_tab = function(tab_id) {
      if(tab_id !== $scope.active) {
        //console.log('select_tab: ' + id);
        _socket.emit('select', tab_id);
      }
    };
    $scope.close_tab = function(tab_id) {
      _socket.emit('close', tab_id);
    };

    $scope.cmd_back = function() {
      _socket.emit('back');
    };
    $scope.cmd_forward = function() {
      _socket.emit('forward');
    };
    $scope.cmd_new = function() {
      _socket.emit('new');
    };
  });

//
// ## strip
//
// Directive representing the actual strip
//
// ```
// @=state    {} the current tabs state
// ```
//
angular.module('breach.directives').directive('strip', function() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      state: '=state',
    },
    templateUrl: 'strip_d.html',
    controller: 'StripCtrl'
  };
});
