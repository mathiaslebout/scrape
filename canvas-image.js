/*
  CanvasImage Class
  Class that wraps the html image element and canvas.
  It also simplifies some of the canvas context manipulation
  with a set of helper functions.
*/
// var CanvasImage = function (image) {
//     this.canvas  = document.createElement('canvas');
//     this.context = this.canvas.getContext('2d');

//     document.body.appendChild(this.canvas);

//     this.width  = this.canvas.width  = image.width;
//     this.height = this.canvas.height = image.height;

//     this.context.drawImage(image, 0, 0, this.width, this.height);
// };

var paper = require('paper')

var CanvasImage = function (raster) {
    this.raster = raster;
    this.canvas = raster.canvas;
    // this.context = raster.context;
    
    this.width = this.canvas.width
    this.height = this.canvas.height
}

CanvasImage.prototype.clear = function () {
    // this.context.clearRect(0, 0, this.width, this.height);
};

CanvasImage.prototype.update = function (imageData) {
    // this.context.putImageData(imageData, 0, 0);
};

CanvasImage.prototype.getPixelCount = function () {
    return this.width * this.height;
};

CanvasImage.prototype.getImageData = function () {
    // return this.context.getImageData(0, 0, this.width, this.height);
    return this.raster.getImageData(new paper.Rectangle(0, 0, this.width, this.height))
};

CanvasImage.prototype.removeCanvas = function () {
    // this.canvas.parentNode.removeChild(this.canvas);
};

module.exports = CanvasImage;