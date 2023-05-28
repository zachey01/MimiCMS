const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const concat = require("gulp-concat");
const uglify = require("gulp-uglify");
const browserify = require("gulp-browserify");
const htmlmin = require("gulp-htmlmin");
const browserSync = require("browser-sync").create();
const fileinclude = require("gulp-file-include");
const realFavicon = require("gulp-real-favicon");
const fs = require("fs");
const zip = require("gulp-zip");

let FAVICON_DATA_FILE = "faviconData.json";

// Convert SCSS to css
gulp.task("sass", function () {
  return gulp.src("src/scss/*.scss").pipe(sass()).pipe(gulp.dest("dist/css"));
});

// Create zip build
gulp.task("zip", function (callback) {
  gulp.src("dist/*").pipe(zip("dist.zip")).pipe(gulp.dest("./"));
  callback();
});

// Favicons generator
gulp.task("generate-favicon", function (done) {
  console.log("---------- Генерация фавиконок ----------");
  realFavicon.generateFavicon(
    {
      masterPicture: "./src/img/favicons/logo.svg", // Specify the path to the original image
      dest: "./dist/img/favicon", // Specify the path to the favicon upload folder
      iconsPath: "./src/img/favicon/", // Specify a folder for favicons
      design: {
        ios: {
          // pictureAspect: 'noChange', // Default, no indentation
          // For all additional options, see https://realfavicongenerator.net/favicon/gulp
          pictureAspect: "backgroundAndMargin",
          backgroundColor: "#ffffff",
          margin: "10%",
          assets: {
            ios6AndPriorIcons: false,
            ios7AndLaterIcons: false,
            precomposedIcons: false,
            declareOnlyDefaultIcon: true,
          },
        },
        desktopBrowser: {},
        windows: {
          pictureAspect: "noChange",
          backgroundColor: "#ffffff",
          onConflict: "override",
          assets: {
            windows80Ie10Tile: false,
            windows10Ie11EdgeTiles: {
              small: false,
              medium: true,
              big: false,
              rectangle: false,
            },
          },
        },
        androidChrome: {
          pictureAspect: "noChange",
          themeColor: "#ffffff",
          manifest: {
            display: "standalone",
            orientation: "notSet",
            onConflict: "override",
            declared: true,
          },
          assets: {
            legacyIcon: false,
            lowResolutionIcons: false,
          },
        },
        safariPinnedTab: {
          pictureAspect: "silhouette",
          themeColor: "#ffffff",
        },
      },
      settings: {
        scalingAlgorithm: "Mitchell",
        errorOnImageTooSmall: false,
      },
      markupFile: FAVICON_DATA_FILE,
    },
    function () {
      done();
    }
  );
});

// Inserting code into HTML with the connection of favicons
gulp.task("inject-favicon-markups", function () {
  return gulp
    .src(["./src/include/head.html"])
    .pipe(
      realFavicon.injectFaviconMarkups(
        JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code
      )
    )
    .pipe(gulp.dest("./dist/include/"));
});

// Manually check if the data for the favicon is up to date. Run before starting a new project.
gulp.task("check-for-favicon-update", function (done) {
  console.log("---------- Проверка актуальности данных ----------");
  let currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  realFavicon.checkForUpdates(currentVersion, function (err) {
    if (err) {
      throw err;
    }
  });
});

// HTML includes
gulp.task("html:build", function () {
  return gulp
    .src([`src/*.html`])
    .pipe(
      fileinclude({
        prefix: "@",
        basepath: "@file",
      })
    )
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.stream());
});

// Live server
gulp.task("browserSync", function () {
  browserSync.init({
    server: {
      baseDir: "dist",
    },
  });
});

// Compile JS
gulp.task("js", function () {
  return gulp
    .src("src/js/*.js")
    .pipe(
      browserify({
        insertGlobals: true,
      })
    )
    .pipe(uglify())
    .pipe(gulp.dest("dist/js"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

// Copy PHP files
gulp.task("php", function () {
  return gulp
    .src("src/php/*.php")
    .pipe(gulp.dest("dist/php"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

// Copy img
gulp.task("img", function () {
  return gulp
    .src("src/img/*")
    .pipe(gulp.dest("dist/img"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

// Minify HTML
gulp.task("html", () => {
  return gulp
    .src("src/**/*.html")
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest("dist/"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

// Watch for changes
gulp.task("watch", function () {
  gulp.watch("src/scss/*.scss", gulp.series("sass"));
  gulp.watch("src/js/*.js", gulp.series("js"));
  gulp.watch("src/php/*.php", gulp.series("php"));
  gulp.watch("src/img/*", gulp.series("img"));
  gulp.watch("src/**/*.html", gulp.series("html"));
  gulp.watch("src/**/*", gulp.series("browserSync"));
  gulp.watch("src/*.html", gulp.series("html:build"));
  gulp.watch("src/include/*.html", gulp.series("inject-favicon-markups"));
});

// default task
gulp.task(
  "default",
  gulp.parallel(
    "sass",
    "js",
    "php",
    "img",
    "html",
    "browserSync",
    "html:build",
    "inject-favicon-markups",
    "watch"
  )
);
