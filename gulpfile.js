const { src, dest, series, parallel } = require('gulp');
const through2 = require('through2');
const Jimp = require('jimp');
const del = require('del');
const rename = require('gulp-rename');
const gulpWebp = require('gulp-webp');
const imagemin = require('gulp-imagemin');
const svgStore = require('gulp-svgstore');

const SIZES = [3740, 1870, 935, 750];

const clear = () => {
  return del('build/');
}

const resizeItem = (width) => {
  return function resizeImage () {
    const quality = 100;
    return src('source/*.{jpg,png}')
      .pipe(dest('build/'))
      .pipe(
        through2.obj(async function (file, _, cb) {
          if (file.isBuffer()) {
            const img = await Jimp.read(file.contents);
            const smallImg = img.resize(width, Jimp.AUTO).quality(quality);
            const content = await smallImg.getBufferAsync(Jimp.AUTO);
            file.contents = Buffer.from(content);
          }
          cb(null, file);
        })
      )
      .pipe(rename((path) => {
        path.basename += `-${width}w`;
      }))
      .pipe(imagemin([
        imagemin.mozjpeg({ quality: 75, progressive: true }),
        imagemin.optipng({ optimizationLevel: 3 }),
      ]))
      .pipe(dest('build/'))
      .pipe(gulpWebp())
      .pipe(dest('build/'));
  };
};

const resize = SIZES.map((size) => {
  return resizeItem(size);
});

const optimize = () => {
  return src('source/*')
  .pipe(imagemin([
    imagemin.mozjpeg({ quality: 75, progressive: true }),
    imagemin.optipng({ optimizationLevel: 3 }),
    imagemin.svgo({
      plugins: [
        { removeViewBox: false },
      ]
    })
  ]))
  .pipe(dest('build/'))
  .pipe(gulpWebp())
  .pipe(dest('build/'));
};

const optimizeSVG = () => {
  return src('source/*.svg')
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
        ]
      })
    ]))
    .pipe(dest('build/'));
};

const sprite = () => {
  return src('source/sprite/*.svg')
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [
          { removeXMLNS: true },
          { removeViewBox: false },
          { removeDimensions: true },
        ]
      })
    ]))
    .pipe(svgStore({ inlineSvg: true }))
    .pipe(dest('build/'));
};

exports.optimize = series(
  clear,
  optimize,
  sprite
);

exports.default = series(
  clear,
  parallel(
    ...resize,
    optimizeSVG,
    sprite
  )
);



