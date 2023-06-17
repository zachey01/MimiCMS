# MimiCMS

<img src="https://media.discordapp.net/attachments/1110890217478557726/1118836804183928922/1.png" align="right"
     alt="MimiCMS by Zachey" width="170" height="170">

Модульная, быстрая CMS для CS:GO, CS2 (скоро) сервера. Приемущества

- Кастомные **способы оплаты**. Вы можете использовать любую систему оплатиы, для добавления нужно переписать шаблон API-запросов под официальную документацию системы оплаты.
- Кастомный **автодонат** (тоесть: вы можете использовать любой плагин для выдачи доната, достаточно всего лишь указать комманду для выдачи привелегии в графу _givecmd_).
- Удобная **админ-панель** для управления сайтом и самим сервером через _RCON_.
- Защита от **DDOS-атак.** IP адреса с подозрительной активностью будут добавляться в blacklist.
- Прост в **изменении**. В админ-панели в можете изменить каждую страницу под ваши требования.
- **Быстра и малотредобавтельна**. CMS может быть запущена даже на самом дешевом VPS (P.S: CMS весит всего _~45mb._).
- Полное **логгирование**. Если в CMS произошла ошибка, то вы с легкостью сможете узнать причины и исправить её, также вы сможете отследить действия забанненого игрока.
- Возможность **создания бэкапов**.
- **Цена**. MimiCMS - полностью бесплатна!

[GitHub action]: https://github.com/andresz1/size-limit-action
[Statoscope]: https://github.com/statoscope/statoscope
[cult-img]: http://cultofmartians.com/assets/badges/badge.svg
[cult]: http://cultofmartians.com/tasks/size-limit-config.html

## Установка

### 1. Клонированние репозитория

Склонируйте этот репозиторий:

```bash
git clone https://github.com/zachey01/MimiCMS.git
```

И перейдите в склонированную директорию:

```bash
cd MimiCMS
```

### 2. Установка зависимостей

> P.S: у вас дожны быть установленны NodeJS и NPM

Для работы CMS нужно установить необходимые зависимости:

```bash
npm i
```

И если вы используете VPS/VDS, то вам нужно установить [Forever]() для постоянной работы сайта:

```bash
npm i forever
```

### 3. Настройка

Для начала переименуйте файл `env.example` в `.env` и откройте эго в текстовом редакторе.

В начале находятся переменные для подключения к базе данных MySQL.

`DB_HOST` - это адрес расположения базы данных (обычно это 127.0.0.1).

`DB_USER` - это имя пользователя для доступа к бд.

`DB_PASSWORD` - это пароль пользователя для доступа к бд.

`DB_NAME` - это название базы данных.

Далее идет настройка вебсервера:

`PORT`- это порт на котором будет работать сайт (если хотите чтобы порт не отображался в URL, то оставьте пустым то есть будет установлен порт _80_).

`DOMAIN` - тут укажите домен на котором размешен сайт, если локально то оставьте пустым

Далее идут настройки самого сайта.

`STEAM_API_KEY` - это web api key для steam, её можно получить [тут]().

`SECRET` - сюда надо вставить рандомную сгенерированную строку (минимум 32 символа).

Остальные параметры понятны.

Далее идет конфигурация самого сервера

`SERVER_IP` - IP адрес сервера
`SERVER_PORT` - порт сервера

## Usage

### JS Applications

Suitable for applications that have their own bundler and send the JS bundle
directly to a client (without publishing it to npm). Think of a user-facing app
or website, like an email client, a CRM, a landing page or a blog with
interactive elements, using React/Vue/Svelte lib or vanilla JS.

<details><summary><b>Show instructions</b></summary>

1. Install the preset:

   ```sh
   npm install --save-dev size-limit @size-limit/file
   ```

2. Add the `size-limit` section and the `size` script to your `package.json`:

   ```diff
   + "size-limit": [
   +   {
   +     "path": "dist/app-*.js"
   +   }
   + ],
     "scripts": {
       "build": "webpack ./webpack.config.js",
   +   "size": "npm run build && size-limit",
       "test": "jest && eslint ."
     }
   ```

3. Here’s how you can get the size for your current project:

   ```sh
   $ npm run size

     Package size: 30.08 kB with all dependencies, minified and gzipped
   ```

4. Now, let’s set the limit. Add 25% to the current total size and use that as
   the limit in your `package.json`:

   ```diff
     "size-limit": [
       {
   +     "limit": "35 kB",
         "path": "dist/app-*.js"
       }
     ],
   ```

5. Add the `size` script to your test suite:

   ```diff
     "scripts": {
       "build": "webpack ./webpack.config.js",
       "size": "npm run build && size-limit",
   -   "test": "jest && eslint ."
   +   "test": "jest && eslint . && npm run size"
     }
   ```

6. If you don’t have a continuous integration service running, don’t forget
   to add one — start with [Travis CI].

</details>

### JS Application and Time-based Limit

File size limit (in kB) is not the best way to describe your JS application
cost for developers. Developers will compare the size of the JS bundle
with the size of images. But browsers need much more time to parse 100 kB
of JS than 100 kB of an image since JS compilers are very complex.

This is why Size Limit support time-based limit. It runs headless Chrome
to track the time a browser takes to compile and execute your JS.

<details><summary><b>Show instructions</b></summary>

1. Install the preset:

   ```sh
   npm install --save-dev size-limit @size-limit/preset-app
   ```

2. Add the `size-limit` section and the `size` script to your `package.json`:

   ```diff
   + "size-limit": [
   +   {
   +     "path": "dist/app-*.js"
   +   }
   + ],
     "scripts": {
       "build": "webpack ./webpack.config.js",
   +   "size": "npm run build && size-limit",
       "test": "jest && eslint ."
     }
   ```

3. Here’s how you can get the size for your current project:

   ```sh
   $ npm run size

     Package size: 30.08 kB with all dependencies, minified and gzipped
     Loading time: 602 ms   on slow 3G
     Running time: 214 ms   on Snapdragon 410
     Total time:   815 ms
   ```

4. Now, let’s set the limit. Add 25% to the current total time and use that as
   the limit in your `package.json`:

   ```diff
     "size-limit": [
       {
   +     "limit": "1 s",
         "path": "dist/app-*.js"
       }
     ],
   ```

5. Add the `size` script to your test suite:

   ```diff
     "scripts": {
       "build": "webpack ./webpack.config.js",
       "size": "npm run build && size-limit",
   -   "test": "jest && eslint ."
   +   "test": "jest && eslint . && npm run size"
     }
   ```

6. If you don’t have a continuous integration service running, don’t forget
   to add one — start with [Travis CI].

</details>

### Big Libraries

JS libraries > 10 kB in size.

This preset includes headless Chrome, and will measure your lib’s execution
time. You likely don’t need this overhead for a small 2 kB lib, but for larger
ones the execution time is a more accurate and understandable metric that
the size in bytes. Libraries like [React] are good examples for this preset.

<details><summary><b>Show instructions</b></summary>

1. Install preset:

   ```sh
   npm install --save-dev size-limit @size-limit/preset-big-lib
   ```

2. Add the `size-limit` section and the `size` script to your `package.json`:

   ```diff
   + "size-limit": [
   +   {
   +     "path": "dist/react.production-*.js"
   +   }
   + ],
     "scripts": {
       "build": "webpack ./scripts/rollup/build.js",
   +   "size": "npm run build && size-limit",
       "test": "jest && eslint ."
     }
   ```

3. If you use ES modules you can test the size after tree-shaking with `import`
   option:

   ```diff
     "size-limit": [
       {
         "path": "dist/react.production-*.js",
   +     "import": "{ createComponent }"
       }
     ],
   ```

4. Here’s how you can get the size for your current project:

   ```sh
   $ npm run size

     Package size: 30.08 kB with all dependencies, minified and gzipped
     Loading time: 602 ms   on slow 3G
     Running time: 214 ms   on Snapdragon 410
     Total time:   815 ms
   ```

5. Now, let’s set the limit. Add 25% to the current total time and use that
   as the limit in your `package.json`:

   ```diff
     "size-limit": [
       {
   +     "limit": "1 s",
         "path": "dist/react.production-*.js"
       }
     ],
   ```

6. Add a `size` script to your test suite:

   ```diff
     "scripts": {
       "build": "rollup ./scripts/rollup/build.js",
       "size": "npm run build && size-limit",
   -   "test": "jest && eslint ."
   +   "test": "jest && eslint . && npm run size"
     }
   ```

7. If you don’t have a continuous integration service running, don’t forget
   to add one — start with [Travis CI].
8. Add the library size to docs, it will help users to choose your project:

   ```diff
     # Project Name

     Short project description

     * **Fast.** 10% faster than competitor.
   + * **Small.** 15 kB (minified and gzipped).
   +   [Size Limit](https://github.com/ai/size-limit) controls the size.
   ```

</details>

### Small Libraries

JS libraries < 10 kB in size.

This preset will only measure the size, without the execution time, so it’s
suitable for small libraries. If your library is larger, you likely want
the Big Libraries preset above. [Nano ID] or [Storeon] are good examples
for this preset.

<details><summary><b>Show instructions</b></summary>

1. First, install `size-limit`:

   ```sh
   npm install --save-dev size-limit @size-limit/preset-small-lib
   ```

2. Add the `size-limit` section and the `size` script to your `package.json`:

   ```diff
   + "size-limit": [
   +   {
   +     "path": "index.js"
   +   }
   + ],
     "scripts": {
   +   "size": "size-limit",
       "test": "jest && eslint ."
     }
   ```

3. Here’s how you can get the size for your current project:

   ```sh
   $ npm run size

     Package size: 177 B with all dependencies, minified and gzipped
   ```

4. If your project size starts to look bloated, run `--why` for analysis:

   ```sh
   npm run size -- --why
   ```

   > We use [Statoscope](https://github.com/statoscope/statoscope) as bundle analyzer.

5. Now, let’s set the limit. Determine the current size of your library,
   add just a little bit (a kilobyte, maybe) and use that as the limit
   in your `package.json`:

   ```diff
    "size-limit": [
       {
   +     "limit": "9 kB",
         "path": "index.js"
       }
    ],
   ```

6. Add the `size` script to your test suite:

   ```diff
     "scripts": {
       "size": "size-limit",
   -   "test": "jest && eslint ."
   +   "test": "jest && eslint . && npm run size"
     }
   ```

7. If you don’t have a continuous integration service running, don’t forget
   to add one — start with [Travis CI].
8. Add the library size to docs, it will help users to choose your project:

   ```diff
     # Project Name

     Short project description

     * **Fast.** 10% faster than competitor.
   + * **Small.** 500 bytes (minified and gzipped). No dependencies.
   +   [Size Limit](https://github.com/ai/size-limit) controls the size.
   ```

</details>
