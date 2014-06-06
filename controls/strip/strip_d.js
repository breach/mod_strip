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
          .addClass('border-left'))
        .append($('<div/>')
          .addClass('border-bottom'))
        .append($('<div/>')
          .addClass('border-right'))
        .append($('<div/>')
          .addClass('close-tab')
          .click(function() {
            $scope.close_tab(tab_id);
          })
          .append($('<div/>')
            .addClass('icon-iconfont-01')))
        .append($('<div/>')
          .addClass('favicon'))
        .append($('<div/>')
          .addClass('content')
          .append($('<div/>')
            .addClass('title')))
        .append($('<div/>')
          .addClass('close'));
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
        favicon: ''
      };
      if(tab_data.type === 'new_tab') {
        data.title = 'New Tab';
        data.url = 'toto';
      }
      else {
        data.title = tab_data.title || 'Loading...';
        if(data.title.length > 20) {
          data.title = data.title.substr(0, 20) + '...';
        }
        data.url = tab_data.url || '';
        if(tab_data.state) {
          tab_data.state.entries.forEach(function(n) {
            if(n.visible) {
              if(n.favicon) {
                data.favicon = n.favicon;
              }
            }
          });
        }
      }
      //console.log(JSON.stringify(data, null, 2));
      tab.find('.title').text(data.title);
      if($scope.active === tab_id)
        tab.addClass('active');
      if(data.favicon && data.favicon.length > 0) {
        var favicon_sha = SHA1(data.favicon);
        var favicon_div = tab.find('.favicon');
        if(favicon_sha !== favicon_div.attr('favicon_sha')) {
          favicon_div.css('background-color', 
                          'transparent');
          favicon_div.css('background-image', 
                          'url(' + data.favicon + ')');
          favicon_div.attr('favicon_sha', favicon_sha);
          favicon_div.attr('favicon_host', data.url.hostname);
        }
      }
      else {
        var favicon_sha = SHA1('');
        var favicon_div = tab.find('.favicon');
        if(favicon_div.attr('favicon_host') !== data.url.hostname &&
           favicon_sha !== favicon_div.attr('favicon_sha')) {
          favicon_div.css('background-color', 
                          'hsl(0, 0%, 80%)');
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
      console.log(idx);
      tab.css('left', idx * (TAB_WIDTH + TAB_MARGIN));
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


    /**************************************************************************/
    /* ANGULAR INTEGRATION */
    /**************************************************************************/
    $scope.$watch('state', function(state) {
      console.log(state);
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
