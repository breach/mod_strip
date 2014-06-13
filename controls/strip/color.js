
/*
 * Breach: [mod_layout] strip_c.js
 *
 * Copyright (c) 2014, Stanislas Polu. All rights reserved.
 *
 * @author: spolu
 *
 * @log:
 * - 2014-06-13 spolu  Remove favicon on navigation #2
 * - 2014-06-13 spolu  Loading progress dumpling
 * - 2014-06-11 spolu  Removed angularJS
 * - 2014-06-04 spolu  Forked from `mod_stack`
 * - 2014-05-21 spolu  New state format (tabs on core_state)
 * - 2013-08-15 spolu  Creation
 */
'use strict'

// ## CanvasImage (from colorthief)
//
// Class that wraps the html image element and canvas.
// It also simplifies some of the canvas context manipulation
// with a set of helper functions.
var CanvasImage = function (image) {
  this.canvas  = document.createElement('canvas');
  this.context = this.canvas.getContext('2d');

  document.body.appendChild(this.canvas);

  this.width  = this.canvas.width  = image.width;
  this.height = this.canvas.height = image.height;

  this.context.drawImage(image, 0, 0, this.width, this.height);
};

CanvasImage.prototype.clear = function () {
  this.context.clearRect(0, 0, this.width, this.height);
};

CanvasImage.prototype.update = function (imageData) {
  this.context.putImageData(imageData, 0, 0);
};

CanvasImage.prototype.getPixelCount = function () {
  return this.width * this.height;
};

CanvasImage.prototype.getImageData = function () {
  return this.context.getImageData(0, 0, this.width, this.height);
};

CanvasImage.prototype.removeCanvas = function () {
  this.canvas.parentNode.removeChild(this.canvas);
};


// ### color
//
// Retrieves the main color out of an image
//
// ```
// @spec { }
// ```
var color = function(spec, my) {
  var _super = {};
  my = my || {};
  spec = spec || {};

  //
  // ### _public_
  //
  var get;         /* get(src); */

  //
  // ### _private_
  //
  
  var that = {};

  /****************************************************************************/
  /* PRIVATE HELPERS */
  /****************************************************************************/

  /**************************************************************************/
  /* PUBLIC METHODS */
  /**************************************************************************/
  // ### get
  //
  // Retrieves the color of the specified image. We use it instead of colorthief
  // because we want an exact color rather than an average that works not so
  // well for favicon color extraction.
  // ```
  // @src     {Image} the source image to compute on
  // @quality {integer} optional quality
  // ```
  get = function(src, quality) {
    var src_image    = new CanvasImage(src);
    var src_data     = src_image.getImageData();
    var src_pixels   = src_data.data;
    var src_count    = src_image.getPixelCount();

    var now = Date.now();

    if(typeof quality === 'undefined') {
      quality = 5;
    }

    var buckets = {};
    var best_count = 0;
    var best_str = null;
    for(var i = 0, offset, r, g, b, a; i < src_count; i = i + quality) {
      offset = i * 4;
      r = src_pixels[offset + 0];
      g = src_pixels[offset + 1];
      b = src_pixels[offset + 2];
      a = src_pixels[offset + 3];
      // If pixel is mostly opaque and not white
      if(a >= 125 && !(r > 250 && g > 250 && b > 250)) {
        var bucket_str = 
          Math.floor(r/10) + '_' + 
          Math.floor(g/10) + '_' + 
          Math.floor(b/10);
        buckets[bucket_str] = buckets[bucket_str] || {
          count: 0,
          pixels: []
        };
        buckets[bucket_str].count++;
        buckets[bucket_str].pixels.push([r, g, b]);
        if(buckets[bucket_str].count > best_count) {
          best_str = bucket_str;
          best_count = buckets[bucket_str].count;
        }
      }
    }

    src_image.removeCanvas();
    return buckets[best_str].pixels[0];
  };

  that.get = get;

  return that;
};

