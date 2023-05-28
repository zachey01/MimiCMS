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

gulp.task("sass", function () {
  return gulp.src("src/scss/*.scss").pipe(sass()).pipe(gulp.dest("dist/css"));
});

gulp.task("zip", function (callback) {
  gulp.src("dist/*").pipe(zip("dist.zip")).pipe(gulp.dest("./"));
  callback();
});

var FAVICON_DATA_FILE = "faviconData.json";

// Генератор фавиконок
gulp.task("generate-favicon", function (done) {
  console.log("---------- Генерация фавиконок ----------");
  realFavicon.generateFavicon(
    {
      masterPicture: "./src/img/favicons/logo.svg", // Указываем путь к исходному изображению
      dest: "./dist/img/favicon", // Указываем путь к папке выгрузки фавиконок
      iconsPath: "./src/img/favicon/", // Указываем папку для фавиконок
      design: {
        ios: {
          // pictureAspect: 'noChange', // По умолчанию, без отступов
          // Все дополнительные опции смотрим на https://realfavicongenerator.net/favicon/gulp
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

// Вставка кода в HTML с подключением фавиконок
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

// Ручная проверка актуальности данных для favicon. Запускать перед стартом нового проекта.
gulp.task("check-for-favicon-update", function (done) {
  console.log("---------- Проверка актуальности данных ----------");
  var currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  realFavicon.checkForUpdates(currentVersion, function (err) {
    if (err) {
      throw err;
    }
  });
});

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

gulp.task("browserSync", function () {
  browserSync.init({
    server: {
      baseDir: "dist",
    },
  });
});

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

gulp.task("otherjs", function () {
  return gulp
    .src("src/server.js")
    .pipe(concat("server.js"))
    .pipe(uglify())
    .pipe(gulp.dest("dist/"))
    .pipe(
      browserSync.reload({
        stream: true,
      })
    );
});

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

gulp.task("watch", function () {
  gulp.watch("src/scss/*.scss", gulp.series("sass"));
  gulp.watch("src/js/*.js", gulp.series("js"));
  gulp.watch("src/*.js", gulp.series("otherjs"));
  gulp.watch("src/php/*.php", gulp.series("php"));
  gulp.watch("src/img/*", gulp.series("img"));
  gulp.watch("src/**/*.html", gulp.series("html"));
  gulp.watch("src/**/*", gulp.series("browserSync"));
  gulp.watch("src/*.html", gulp.series("html:build"));
  gulp.watch("src/include/*.html", gulp.series("inject-favicon-markups"));
});

gulp.task(
  "default",
  gulp.parallel(
    "sass",
    "js",
    "php",
    "otherjs",
    "img",
    "html",
    "browserSync",
    "html:build",
    "inject-favicon-markups",
    "watch"
  )
);
