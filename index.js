/*
 * Breach: [mod_strip] index.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-07-22 spolu   Fix DNS error when not connected
 * - 2014-06-04 spolu   Move to `mod_layout`
 * - 2014-01-17 spolu   Creation
 */
"use strict"

var express = require('express');
var http = require('http');
var common = require('./lib/common.js');
var breach = require('breach_module');
var async = require('async');
var request = require('request');

/******************************************************************************/
/* MODULE BOOTSTRAP */
/******************************************************************************/
var bootstrap = function(http_srv) {
  var http_port = http_srv.address().port;

  common._ = {
    box: require('./lib/box.js').box({
      http_port: http_port
    }),
    tabs: require('./lib/tabs.js').tabs({}),
    strip: require('./lib/strip.js').strip({
      http_port: http_port
    }),
    /*
    stack: require('./lib/stack.js').stack({
      http_port: http_port
    }),
    */
    devtools: require('./lib/devtools.js').devtools({
      http_port: http_port
    })
  };

  breach.init(function() {
    breach.register('.*', 'devtools');
    breach.register('mod_strip', 'box_.*');
    breach.register('core', 'tabs:.*');
    breach.register('core', 'controls:keyboard');
  
    breach.register('core', 'auto_update:.*');
    breach.register('core', 'modules:.*');
  
    breach.expose('init', function(src, args, cb_) {
      async.parallel([
        common._.box.init,
        common._.tabs.init,
        common._.strip.init,
        //common._.stack.init,
        common._.devtools.init
      ], cb_);
    });
  
    breach.expose('kill', function(args, cb_) {
      async.parallel([
        common._.box.kill,
        common._.tabs.kill,
        common._.strip.kill,
        //common._.stack.kill,
        common._.devtools.kill
      ], function(err) {
        common.exit(0);
      });
    });

    breach.expose('add_bar', function(src, args, cb_) {
       console.log("adding bar ", args.url + ':' + args.dimension);
       common._.strip.addBar(args, cb_);
    });
  });

  var io = require('socket.io').listen(http_srv, {
    'log level': 1
  });

  io.sockets.on('connection', function (socket) {
    socket.on('handshake', function (name) {
      var name_r = /^_(.*)$/;
      var name_m = name_r.exec(name);
      if(name_m && common._[name_m[1]]) {
        common._[name_m[1]].handshake(socket);
      }
    });
  });
};

/******************************************************************************/
/* SETUP */
/******************************************************************************/
(function setup() {
  var app = express();

  var args = process.argv;
  args.forEach(function(a) {
    if(a === '--debug') {
      common.DEBUG = true;
    }
  });

  /* App Configuration */
  app.use('/', express.static(__dirname + '/controls'));
  app.use(require('body-parser')());
  app.use(require('method-override')())

  app.get('/proxy', function(req, res, next) {
    request(req.param('url')).on('error', function(err) {
      /* We only log errors here (happen when not connected while trying to */
      /* retrieve the favicon through the proxy.                            */
      common.log.error(err);
    })
    .pipe(res);
  });

  var http_srv = http.createServer(app).listen(0, '127.0.0.1');

  http_srv.on('listening', function() {
    var port = http_srv.address().port;
    common.log.out('HTTP Server started on `http://127.0.0.1:' + port + '`');
    return bootstrap(http_srv);
  });
})();


process.on('uncaughtException', function(err) {
  common.fatal(err);
});
