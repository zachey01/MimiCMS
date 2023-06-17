var VBSP = function (VBSP) {
  VBSP = VBSP || {};

  var Module = typeof VBSP !== "undefined" ? VBSP : {};
  var moduleOverrides = {};
  var key;
  for (key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }
  Module["arguments"] = [];
  Module["thisProgram"] = "./this.program";
  Module["quit"] = function (status, toThrow) {
    throw toThrow;
  };
  Module["preRun"] = [];
  Module["postRun"] = [];
  var ENVIRONMENT_IS_WEB = false;
  var ENVIRONMENT_IS_WORKER = false;
  var ENVIRONMENT_IS_NODE = false;
  var ENVIRONMENT_IS_SHELL = false;
  if (Module["ENVIRONMENT"]) {
    if (Module["ENVIRONMENT"] === "WEB") {
      ENVIRONMENT_IS_WEB = true;
    } else if (Module["ENVIRONMENT"] === "WORKER") {
      ENVIRONMENT_IS_WORKER = true;
    } else if (Module["ENVIRONMENT"] === "NODE") {
      ENVIRONMENT_IS_NODE = true;
    } else if (Module["ENVIRONMENT"] === "SHELL") {
      ENVIRONMENT_IS_SHELL = true;
    } else {
      throw new Error(
        "Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL."
      );
    }
  } else {
    ENVIRONMENT_IS_WEB = typeof window === "object";
    ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    ENVIRONMENT_IS_NODE =
      typeof process === "object" &&
      typeof require === "function" &&
      !ENVIRONMENT_IS_WEB &&
      !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL =
      !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  }
  if (ENVIRONMENT_IS_NODE) {
    var nodeFS;
    var nodePath;
    Module["read"] = function shell_read(filename, binary) {
      var ret;
      if (!nodeFS) nodeFS = require("fs");
      if (!nodePath) nodePath = require("path");
      filename = nodePath["normalize"](filename);
      ret = nodeFS["readFileSync"](filename);
      return binary ? ret : ret.toString();
    };
    Module["readBinary"] = function readBinary(filename) {
      var ret = Module["read"](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert(ret.buffer);
      return ret;
    };
    if (process["argv"].length > 1) {
      Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
    }
    Module["arguments"] = process["argv"].slice(2);
    process["on"]("uncaughtException", function (ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });
    process["on"]("unhandledRejection", function (reason, p) {
      process["exit"](1);
    });
    Module["inspect"] = function () {
      return "[Emscripten Module object]";
    };
  } else if (ENVIRONMENT_IS_SHELL) {
    if (typeof read != "undefined") {
      Module["read"] = function shell_read(f) {
        return read(f);
      };
    }
    Module["readBinary"] = function readBinary(f) {
      var data;
      if (typeof readbuffer === "function") {
        return new Uint8Array(readbuffer(f));
      }
      data = read(f, "binary");
      assert(typeof data === "object");
      return data;
    };
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
    if (typeof quit === "function") {
      Module["quit"] = function (status, toThrow) {
        quit(status);
      };
    }
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function shell_read(url) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      Module["readBinary"] = function readBinary(url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return new Uint8Array(xhr.response);
      };
    }
    Module["readAsync"] = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
          onload(xhr.response);
          return;
        }
        onerror();
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
    Module["setWindowTitle"] = function (title) {
      document.title = title;
    };
  }
  Module["print"] =
    typeof console !== "undefined"
      ? console.log.bind(console)
      : typeof print !== "undefined"
      ? print
      : null;
  Module["printErr"] =
    typeof printErr !== "undefined"
      ? printErr
      : (typeof console !== "undefined" && console.warn.bind(console)) ||
        Module["print"];
  Module.print = Module["print"];
  Module.printErr = Module["printErr"];
  for (key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  moduleOverrides = undefined;
  var STACK_ALIGN = 16;
  function staticAlloc(size) {
    assert(!staticSealed);
    var ret = STATICTOP;
    STATICTOP = (STATICTOP + size + 15) & -16;
    return ret;
  }
  function dynamicAlloc(size) {
    assert(DYNAMICTOP_PTR);
    var ret = HEAP32[DYNAMICTOP_PTR >> 2];
    var end = (ret + size + 15) & -16;
    HEAP32[DYNAMICTOP_PTR >> 2] = end;
    if (end >= TOTAL_MEMORY) {
      var success = enlargeMemory();
      if (!success) {
        HEAP32[DYNAMICTOP_PTR >> 2] = ret;
        return 0;
      }
    }
    return ret;
  }
  function alignMemory(size, factor) {
    if (!factor) factor = STACK_ALIGN;
    var ret = (size = Math.ceil(size / factor) * factor);
    return ret;
  }
  function getNativeTypeSize(type) {
    switch (type) {
      case "i1":
      case "i8":
        return 1;
      case "i16":
        return 2;
      case "i32":
        return 4;
      case "i64":
        return 8;
      case "float":
        return 4;
      case "double":
        return 8;
      default: {
        if (type[type.length - 1] === "*") {
          return 4;
        } else if (type[0] === "i") {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits / 8;
        } else {
          return 0;
        }
      }
    }
  }
  function warnOnce(text) {
    if (!warnOnce.shown) warnOnce.shown = {};
    if (!warnOnce.shown[text]) {
      warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  }
  var functionPointers = new Array(0);
  var GLOBAL_BASE = 1024;
  var ABORT = 0;
  var EXITSTATUS = 0;
  function assert(condition, text) {
    if (!condition) {
      abort("Assertion failed: " + text);
    }
  }
  function getCFunc(ident) {
    var func = Module["_" + ident];
    assert(
      func,
      "Cannot call unknown function " + ident + ", make sure it is exported"
    );
    return func;
  }
  var JSfuncs = {
    stackSave: function () {
      stackSave();
    },
    stackRestore: function () {
      stackRestore();
    },
    arrayToC: function (arr) {
      var ret = stackAlloc(arr.length);
      writeArrayToMemory(arr, ret);
      return ret;
    },
    stringToC: function (str) {
      var ret = 0;
      if (str !== null && str !== undefined && str !== 0) {
        var len = (str.length << 2) + 1;
        ret = stackAlloc(len);
        stringToUTF8(str, ret, len);
      }
      return ret;
    },
  };
  var toC = { string: JSfuncs["stringToC"], array: JSfuncs["arrayToC"] };
  function ccall(ident, returnType, argTypes, args, opts) {
    var func = getCFunc(ident);
    var cArgs = [];
    var stack = 0;
    if (args) {
      for (var i = 0; i < args.length; i++) {
        var converter = toC[argTypes[i]];
        if (converter) {
          if (stack === 0) stack = stackSave();
          cArgs[i] = converter(args[i]);
        } else {
          cArgs[i] = args[i];
        }
      }
    }
    var ret = func.apply(null, cArgs);
    if (returnType === "string") ret = Pointer_stringify(ret);
    else if (returnType === "boolean") ret = Boolean(ret);
    if (stack !== 0) {
      stackRestore(stack);
    }
    return ret;
  }
  function cwrap(ident, returnType, argTypes) {
    argTypes = argTypes || [];
    var cfunc = getCFunc(ident);
    var numericArgs = argTypes.every(function (type) {
      return type === "number";
    });
    var numericRet = returnType !== "string";
    if (numericRet && numericArgs) {
      return cfunc;
    }
    return function () {
      return ccall(ident, returnType, argTypes, arguments);
    };
  }
  function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*") type = "i32";
    switch (type) {
      case "i1":
        HEAP8[ptr >> 0] = value;
        break;
      case "i8":
        HEAP8[ptr >> 0] = value;
        break;
      case "i16":
        HEAP16[ptr >> 1] = value;
        break;
      case "i32":
        HEAP32[ptr >> 2] = value;
        break;
      case "i64":
        (tempI64 = [
          value >>> 0,
          ((tempDouble = value),
          +Math_abs(tempDouble) >= 1
            ? tempDouble > 0
              ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) |
                  0) >>>
                0
              : ~~+Math_ceil(
                  (tempDouble - +(~~tempDouble >>> 0)) / 4294967296
                ) >>> 0
            : 0),
        ]),
          (HEAP32[ptr >> 2] = tempI64[0]),
          (HEAP32[(ptr + 4) >> 2] = tempI64[1]);
        break;
      case "float":
        HEAPF32[ptr >> 2] = value;
        break;
      case "double":
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort("invalid type for setValue: " + type);
    }
  }
  var ALLOC_NORMAL = 0;
  var ALLOC_STATIC = 2;
  var ALLOC_NONE = 4;
  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
      zeroinit = true;
      size = slab;
    } else {
      zeroinit = false;
      size = slab.length;
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr;
    } else {
      ret = [
        typeof _malloc === "function" ? _malloc : staticAlloc,
        stackAlloc,
        staticAlloc,
        dynamicAlloc,
      ][allocator === undefined ? ALLOC_STATIC : allocator](
        Math.max(size, singleType ? 1 : types.length)
      );
    }
    if (zeroinit) {
      var stop;
      ptr = ret;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0;
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0;
      }
      return ret;
    }
    if (singleType === "i8") {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret);
      } else {
        HEAPU8.set(new Uint8Array(slab), ret);
      }
      return ret;
    }
    var i = 0,
      type,
      typeSize,
      previousType;
    while (i < size) {
      var curr = slab[i];
      type = singleType || types[i];
      if (type === 0) {
        i++;
        continue;
      }
      if (type == "i64") type = "i32";
      setValue(ret + i, curr, type);
      if (previousType !== type) {
        typeSize = getNativeTypeSize(type);
        previousType = type;
      }
      i += typeSize;
    }
    return ret;
  }
  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr) return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
      t = HEAPU8[(ptr + i) >> 0];
      hasUtf |= t;
      if (t == 0 && !length) break;
      i++;
      if (length && i == length) break;
    }
    if (!length) length = i;
    var ret = "";
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(
          String,
          HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK))
        );
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK;
      }
      return ret;
    }
    return UTF8ToString(ptr);
  }
  var UTF8Decoder =
    typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
  function UTF8ArrayToString(u8Array, idx) {
    var endPtr = idx;
    while (u8Array[endPtr]) ++endPtr;
    if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
      return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
    } else {
      var u0, u1, u2, u3, u4, u5;
      var str = "";
      while (1) {
        u0 = u8Array[idx++];
        if (!u0) return str;
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode(((u0 & 31) << 6) | u1);
          continue;
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          u3 = u8Array[idx++] & 63;
          if ((u0 & 248) == 240) {
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | u3;
          } else {
            u4 = u8Array[idx++] & 63;
            if ((u0 & 252) == 248) {
              u0 = ((u0 & 3) << 24) | (u1 << 18) | (u2 << 12) | (u3 << 6) | u4;
            } else {
              u5 = u8Array[idx++] & 63;
              u0 =
                ((u0 & 1) << 30) |
                (u1 << 24) |
                (u2 << 18) |
                (u3 << 12) |
                (u4 << 6) |
                u5;
            }
          }
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
        }
      }
    }
  }
  function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr);
  }
  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343)
        u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        outU8Array[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        outU8Array[outIdx++] = 192 | (u >> 6);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        outU8Array[outIdx++] = 224 | (u >> 12);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx) break;
        outU8Array[outIdx++] = 240 | (u >> 18);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx) break;
        outU8Array[outIdx++] = 248 | (u >> 24);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      } else {
        if (outIdx + 5 >= endIdx) break;
        outU8Array[outIdx++] = 252 | (u >> 30);
        outU8Array[outIdx++] = 128 | ((u >> 24) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 18) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 12) & 63);
        outU8Array[outIdx++] = 128 | ((u >> 6) & 63);
        outU8Array[outIdx++] = 128 | (u & 63);
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }
  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  }
  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var u = str.charCodeAt(i);
      if (u >= 55296 && u <= 57343)
        u = (65536 + ((u & 1023) << 10)) | (str.charCodeAt(++i) & 1023);
      if (u <= 127) {
        ++len;
      } else if (u <= 2047) {
        len += 2;
      } else if (u <= 65535) {
        len += 3;
      } else if (u <= 2097151) {
        len += 4;
      } else if (u <= 67108863) {
        len += 5;
      } else {
        len += 6;
      }
    }
    return len;
  }
  var UTF16Decoder =
    typeof TextDecoder !== "undefined"
      ? new TextDecoder("utf-16le")
      : undefined;
  var WASM_PAGE_SIZE = 65536;
  var ASMJS_PAGE_SIZE = 16777216;
  var MIN_TOTAL_MEMORY = 16777216;
  function alignUp(x, multiple) {
    if (x % multiple > 0) {
      x += multiple - (x % multiple);
    }
    return x;
  }
  var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  function updateGlobalBuffer(buf) {
    Module["buffer"] = buffer = buf;
  }
  function updateGlobalBufferViews() {
    Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
    Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
    Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
  }
  var STATIC_BASE, STATICTOP, staticSealed;
  var STACK_BASE, STACKTOP, STACK_MAX;
  var DYNAMIC_BASE, DYNAMICTOP_PTR;
  STATIC_BASE =
    STATICTOP =
    STACK_BASE =
    STACKTOP =
    STACK_MAX =
    DYNAMIC_BASE =
    DYNAMICTOP_PTR =
      0;
  staticSealed = false;
  function abortOnCannotGrowMemory() {
    abort(
      "Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " +
        TOTAL_MEMORY +
        ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 "
    );
  }
  if (!Module["reallocBuffer"])
    Module["reallocBuffer"] = function (size) {
      var ret;
      try {
        if (ArrayBuffer.transfer) {
          ret = ArrayBuffer.transfer(buffer, size);
        } else {
          var oldHEAP8 = HEAP8;
          ret = new ArrayBuffer(size);
          var temp = new Int8Array(ret);
          temp.set(oldHEAP8);
        }
      } catch (e) {
        return false;
      }
      var success = _emscripten_replace_memory(ret);
      if (!success) return false;
      return ret;
    };
  function enlargeMemory() {
    var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
    var LIMIT = 2147483648 - PAGE_MULTIPLE;
    if (HEAP32[DYNAMICTOP_PTR >> 2] > LIMIT) {
      return false;
    }
    var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
    TOTAL_MEMORY = Math.max(TOTAL_MEMORY, MIN_TOTAL_MEMORY);
    while (TOTAL_MEMORY < HEAP32[DYNAMICTOP_PTR >> 2]) {
      if (TOTAL_MEMORY <= 536870912) {
        TOTAL_MEMORY = alignUp(2 * TOTAL_MEMORY, PAGE_MULTIPLE);
      } else {
        TOTAL_MEMORY = Math.min(
          alignUp((3 * TOTAL_MEMORY + 2147483648) / 4, PAGE_MULTIPLE),
          LIMIT
        );
      }
    }
    var replacement = Module["reallocBuffer"](TOTAL_MEMORY);
    if (!replacement || replacement.byteLength != TOTAL_MEMORY) {
      TOTAL_MEMORY = OLD_TOTAL_MEMORY;
      return false;
    }
    updateGlobalBuffer(replacement);
    updateGlobalBufferViews();
    return true;
  }
  var byteLength;
  try {
    byteLength = Function.prototype.call.bind(
      Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get
    );
    byteLength(new ArrayBuffer(4));
  } catch (e) {
    byteLength = function (buffer) {
      return buffer.byteLength;
    };
  }
  var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
  var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
  if (TOTAL_MEMORY < TOTAL_STACK)
    Module.printErr(
      "TOTAL_MEMORY should be larger than TOTAL_STACK, was " +
        TOTAL_MEMORY +
        "! (TOTAL_STACK=" +
        TOTAL_STACK +
        ")"
    );
  if (Module["buffer"]) {
    buffer = Module["buffer"];
  } else {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.Memory === "function"
    ) {
      Module["wasmMemory"] = new WebAssembly.Memory({
        initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
      });
      buffer = Module["wasmMemory"].buffer;
    } else {
      buffer = new ArrayBuffer(TOTAL_MEMORY);
    }
    Module["buffer"] = buffer;
  }
  updateGlobalBufferViews();
  function getTotalMemory() {
    return TOTAL_MEMORY;
  }
  HEAP32[0] = 1668509029;
  HEAP16[1] = 25459;
  if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99)
    throw "Runtime error: expected the system to be little-endian!";
  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == "function") {
        callback();
        continue;
      }
      var func = callback.func;
      if (typeof func === "number") {
        if (callback.arg === undefined) {
          Module["dynCall_v"](func);
        } else {
          Module["dynCall_vi"](func, callback.arg);
        }
      } else {
        func(callback.arg === undefined ? null : callback.arg);
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  var runtimeExited = false;
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function")
        Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift());
      }
    }
    callRuntimeCallbacks(__ATPRERUN__);
  }
  function ensureInitRuntime() {
    if (runtimeInitialized) return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
  }
  function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
  }
  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true;
  }
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function")
        Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift());
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
  }
  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }
  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }
  function writeArrayToMemory(array, buffer) {
    HEAP8.set(array, buffer);
  }
  var Math_abs = Math.abs;
  var Math_cos = Math.cos;
  var Math_sin = Math.sin;
  var Math_tan = Math.tan;
  var Math_acos = Math.acos;
  var Math_asin = Math.asin;
  var Math_atan = Math.atan;
  var Math_atan2 = Math.atan2;
  var Math_exp = Math.exp;
  var Math_log = Math.log;
  var Math_sqrt = Math.sqrt;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_pow = Math.pow;
  var Math_imul = Math.imul;
  var Math_fround = Math.fround;
  var Math_round = Math.round;
  var Math_min = Math.min;
  var Math_max = Math.max;
  var Math_clz32 = Math.clz32;
  var Math_trunc = Math.trunc;
  var runDependencies = 0;
  var runDependencyWatcher = null;
  var dependenciesFulfilled = null;
  function getUniqueRunDependency(id) {
    return id;
  }
  function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies);
    }
  }
  function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies);
    }
    if (runDependencies == 0) {
      if (runDependencyWatcher !== null) {
        clearInterval(runDependencyWatcher);
        runDependencyWatcher = null;
      }
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }
  Module["preloadedImages"] = {};
  Module["preloadedAudios"] = {};
  var dataURIPrefix = "data:application/octet-stream;base64,";
  function isDataURI(filename) {
    return String.prototype.startsWith
      ? filename.startsWith(dataURIPrefix)
      : filename.indexOf(dataURIPrefix) === 0;
  }
  function integrateWasmJS() {
    var wasmTextFile = "vbsp.wast";
    var wasmBinaryFile = "vbsp.wasm";
    var asmjsCodeFile = "vbsp.temp.asm.js";
    if (typeof Module["locateFile"] === "function") {
      if (!isDataURI(wasmTextFile)) {
        wasmTextFile = Module["locateFile"](wasmTextFile);
      }
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = Module["locateFile"](wasmBinaryFile);
      }
      if (!isDataURI(asmjsCodeFile)) {
        asmjsCodeFile = Module["locateFile"](asmjsCodeFile);
      }
    }
    var wasmPageSize = 64 * 1024;
    var info = {
      global: null,
      env: null,
      asm2wasm: {
        "f64-rem": function (x, y) {
          return x % y;
        },
        debugger: function () {
          debugger;
        },
      },
      parent: Module,
    };
    var exports = null;
    function mergeMemory(newBuffer) {
      var oldBuffer = Module["buffer"];
      if (newBuffer.byteLength < oldBuffer.byteLength) {
        Module["printErr"](
          "the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here"
        );
      }
      var oldView = new Int8Array(oldBuffer);
      var newView = new Int8Array(newBuffer);
      newView.set(oldView);
      updateGlobalBuffer(newBuffer);
      updateGlobalBufferViews();
    }
    function fixImports(imports) {
      return imports;
    }
    function getBinary() {
      try {
        if (Module["wasmBinary"]) {
          return new Uint8Array(Module["wasmBinary"]);
        }
        if (Module["readBinary"]) {
          return Module["readBinary"](wasmBinaryFile);
        } else {
          throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
        }
      } catch (err) {
        abort(err);
      }
    }
    function getBinaryPromise() {
      if (
        !Module["wasmBinary"] &&
        (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
        typeof fetch === "function"
      ) {
        return fetch(wasmBinaryFile, { credentials: "same-origin" })
          .then(function (response) {
            if (!response["ok"]) {
              throw (
                "failed to load wasm binary file at '" + wasmBinaryFile + "'"
              );
            }
            return response["arrayBuffer"]();
          })
          .catch(function () {
            return getBinary();
          });
      }
      return new Promise(function (resolve, reject) {
        resolve(getBinary());
      });
    }
    function doNativeWasm(global, env, providedBuffer) {
      if (typeof WebAssembly !== "object") {
        Module["printErr"]("no native wasm support detected");
        return false;
      }
      if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
        Module["printErr"]("no native wasm Memory in use");
        return false;
      }
      env["memory"] = Module["wasmMemory"];
      info["global"] = { NaN: NaN, Infinity: Infinity };
      info["global.Math"] = Math;
      info["env"] = env;
      function receiveInstance(instance, module) {
        exports = instance.exports;
        if (exports.memory) mergeMemory(exports.memory);
        Module["asm"] = exports;
        Module["usingWasm"] = true;
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      if (Module["instantiateWasm"]) {
        try {
          return Module["instantiateWasm"](info, receiveInstance);
        } catch (e) {
          Module["printErr"](
            "Module.instantiateWasm callback failed with error: " + e
          );
          return false;
        }
      }
      function receiveInstantiatedSource(output) {
        receiveInstance(output["instance"], output["module"]);
      }
      function instantiateArrayBuffer(receiver) {
        getBinaryPromise()
          .then(function (binary) {
            return WebAssembly.instantiate(binary, info);
          })
          .then(receiver)
          .catch(function (reason) {
            Module["printErr"](
              "failed to asynchronously prepare wasm: " + reason
            );
            abort(reason);
          });
      }
      if (
        !Module["wasmBinary"] &&
        typeof WebAssembly.instantiateStreaming === "function" &&
        !isDataURI(wasmBinaryFile) &&
        typeof fetch === "function"
      ) {
        WebAssembly.instantiateStreaming(
          fetch(wasmBinaryFile, { credentials: "same-origin" }),
          info
        )
          .then(receiveInstantiatedSource)
          .catch(function (reason) {
            Module["printErr"]("wasm streaming compile failed: " + reason);
            Module["printErr"]("falling back to ArrayBuffer instantiation");
            instantiateArrayBuffer(receiveInstantiatedSource);
          });
      } else {
        instantiateArrayBuffer(receiveInstantiatedSource);
      }
      return {};
    }
    Module["asmPreload"] = Module["asm"];
    var asmjsReallocBuffer = Module["reallocBuffer"];
    var wasmReallocBuffer = function (size) {
      var PAGE_MULTIPLE = Module["usingWasm"]
        ? WASM_PAGE_SIZE
        : ASMJS_PAGE_SIZE;
      size = alignUp(size, PAGE_MULTIPLE);
      var old = Module["buffer"];
      var oldSize = old.byteLength;
      if (Module["usingWasm"]) {
        try {
          var result = Module["wasmMemory"].grow(
            (size - oldSize) / wasmPageSize
          );
          if (result !== (-1 | 0)) {
            return (Module["buffer"] = Module["wasmMemory"].buffer);
          } else {
            return null;
          }
        } catch (e) {
          return null;
        }
      }
    };
    Module["reallocBuffer"] = function (size) {
      if (finalMethod === "asmjs") {
        return asmjsReallocBuffer(size);
      } else {
        return wasmReallocBuffer(size);
      }
    };
    var finalMethod = "";
    Module["asm"] = function (global, env, providedBuffer) {
      env = fixImports(env);
      if (!env["table"]) {
        var TABLE_SIZE = Module["wasmTableSize"];
        if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
        var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
        if (
          typeof WebAssembly === "object" &&
          typeof WebAssembly.Table === "function"
        ) {
          if (MAX_TABLE_SIZE !== undefined) {
            env["table"] = new WebAssembly.Table({
              initial: TABLE_SIZE,
              maximum: MAX_TABLE_SIZE,
              element: "anyfunc",
            });
          } else {
            env["table"] = new WebAssembly.Table({
              initial: TABLE_SIZE,
              element: "anyfunc",
            });
          }
        } else {
          env["table"] = new Array(TABLE_SIZE);
        }
        Module["wasmTable"] = env["table"];
      }
      if (!env["memoryBase"]) {
        env["memoryBase"] = Module["STATIC_BASE"];
      }
      if (!env["tableBase"]) {
        env["tableBase"] = 0;
      }
      var exports;
      exports = doNativeWasm(global, env, providedBuffer);
      if (!exports)
        abort(
          "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods"
        );
      return exports;
    };
  }
  integrateWasmJS();
  STATIC_BASE = GLOBAL_BASE;
  STATICTOP = STATIC_BASE + 7136;
  __ATINIT__.push();
  var STATIC_BUMP = 7136;
  Module["STATIC_BASE"] = STATIC_BASE;
  Module["STATIC_BUMP"] = STATIC_BUMP;
  STATICTOP += 16;
  function ___assert_fail(condition, filename, line, func) {
    abort(
      "Assertion failed: " +
        Pointer_stringify(condition) +
        ", at: " +
        [
          filename ? Pointer_stringify(filename) : "unknown filename",
          line,
          func ? Pointer_stringify(func) : "unknown function",
        ]
    );
  }
  function ___cxa_allocate_exception(size) {
    return _malloc(size);
  }
  function __ZSt18uncaught_exceptionv() {
    return !!__ZSt18uncaught_exceptionv.uncaught_exception;
  }
  var EXCEPTIONS = {
    last: 0,
    caught: [],
    infos: {},
    deAdjust: function (adjusted) {
      if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
      for (var key in EXCEPTIONS.infos) {
        var ptr = +key;
        var info = EXCEPTIONS.infos[ptr];
        if (info.adjusted === adjusted) {
          return ptr;
        }
      }
      return adjusted;
    },
    addRef: function (ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount++;
    },
    decRef: function (ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      assert(info.refcount > 0);
      info.refcount--;
      if (info.refcount === 0 && !info.rethrown) {
        if (info.destructor) {
          Module["dynCall_vi"](info.destructor, ptr);
        }
        delete EXCEPTIONS.infos[ptr];
        ___cxa_free_exception(ptr);
      }
    },
    clearRef: function (ptr) {
      if (!ptr) return;
      var info = EXCEPTIONS.infos[ptr];
      info.refcount = 0;
    },
  };
  function ___cxa_throw(ptr, type, destructor) {
    EXCEPTIONS.infos[ptr] = {
      ptr: ptr,
      adjusted: ptr,
      type: type,
      destructor: destructor,
      refcount: 0,
      caught: false,
      rethrown: false,
    };
    EXCEPTIONS.last = ptr;
    if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
      __ZSt18uncaught_exceptionv.uncaught_exception = 1;
    } else {
      __ZSt18uncaught_exceptionv.uncaught_exception++;
    }
    throw (
      ptr +
      " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."
    );
  }
  var SYSCALLS = {
    varargs: 0,
    get: function (varargs) {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
      return ret;
    },
    getStr: function () {
      var ret = Pointer_stringify(SYSCALLS.get());
      return ret;
    },
    get64: function () {
      var low = SYSCALLS.get(),
        high = SYSCALLS.get();
      if (low >= 0) assert(high === 0);
      else assert(high === -1);
      return low;
    },
    getZero: function () {
      assert(SYSCALLS.get() === 0);
    },
  };
  function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD(),
        offset_high = SYSCALLS.get(),
        offset_low = SYSCALLS.get(),
        result = SYSCALLS.get(),
        whence = SYSCALLS.get();
      var offset = offset_low;
      FS.llseek(stream, offset, whence);
      HEAP32[result >> 2] = stream.position;
      if (stream.getdents && offset === 0 && whence === 0)
        stream.getdents = null;
      return 0;
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.get(),
        iov = SYSCALLS.get(),
        iovcnt = SYSCALLS.get();
      var ret = 0;
      if (!___syscall146.buffers) {
        ___syscall146.buffers = [null, [], []];
        ___syscall146.printChar = function (stream, curr) {
          var buffer = ___syscall146.buffers[stream];
          assert(buffer);
          if (curr === 0 || curr === 10) {
            (stream === 1 ? Module["print"] : Module["printErr"])(
              UTF8ArrayToString(buffer, 0)
            );
            buffer.length = 0;
          } else {
            buffer.push(curr);
          }
        };
      }
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAP32[(iov + i * 8) >> 2];
        var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
        for (var j = 0; j < len; j++) {
          ___syscall146.printChar(stream, HEAPU8[ptr + j]);
        }
        ret += len;
      }
      return ret;
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function ___syscall54(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      return 0;
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
      var stream = SYSCALLS.getStreamFromFD();
      FS.close(stream);
      return 0;
    } catch (e) {
      if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
      return -e.errno;
    }
  }
  function _abort() {
    Module["abort"]();
  }
  var Browser = {
    mainLoop: {
      scheduler: null,
      method: "",
      currentlyRunningMainloop: 0,
      func: null,
      arg: 0,
      timingMode: 0,
      timingValue: 0,
      currentFrameNumber: 0,
      queue: [],
      pause: function () {
        Browser.mainLoop.scheduler = null;
        Browser.mainLoop.currentlyRunningMainloop++;
      },
      resume: function () {
        Browser.mainLoop.currentlyRunningMainloop++;
        var timingMode = Browser.mainLoop.timingMode;
        var timingValue = Browser.mainLoop.timingValue;
        var func = Browser.mainLoop.func;
        Browser.mainLoop.func = null;
        _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
        _emscripten_set_main_loop_timing(timingMode, timingValue);
        Browser.mainLoop.scheduler();
      },
      updateStatus: function () {
        if (Module["setStatus"]) {
          var message = Module["statusMessage"] || "Please wait...";
          var remaining = Browser.mainLoop.remainingBlockers;
          var expected = Browser.mainLoop.expectedBlockers;
          if (remaining) {
            if (remaining < expected) {
              Module["setStatus"](
                message + " (" + (expected - remaining) + "/" + expected + ")"
              );
            } else {
              Module["setStatus"](message);
            }
          } else {
            Module["setStatus"]("");
          }
        }
      },
      runIter: function (func) {
        if (ABORT) return;
        if (Module["preMainLoop"]) {
          var preRet = Module["preMainLoop"]();
          if (preRet === false) {
            return;
          }
        }
        try {
          func();
        } catch (e) {
          if (e instanceof ExitStatus) {
            return;
          } else {
            if (e && typeof e === "object" && e.stack)
              Module.printErr("exception thrown: " + [e, e.stack]);
            throw e;
          }
        }
        if (Module["postMainLoop"]) Module["postMainLoop"]();
      },
    },
    isFullscreen: false,
    pointerLock: false,
    moduleContextCreatedCallbacks: [],
    workers: [],
    init: function () {
      if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
      if (Browser.initted) return;
      Browser.initted = true;
      try {
        new Blob();
        Browser.hasBlobConstructor = true;
      } catch (e) {
        Browser.hasBlobConstructor = false;
        console.log(
          "warning: no blob constructor, cannot create blobs with mimetypes"
        );
      }
      Browser.BlobBuilder =
        typeof MozBlobBuilder != "undefined"
          ? MozBlobBuilder
          : typeof WebKitBlobBuilder != "undefined"
          ? WebKitBlobBuilder
          : !Browser.hasBlobConstructor
          ? console.log("warning: no BlobBuilder")
          : null;
      Browser.URLObject =
        typeof window != "undefined"
          ? window.URL
            ? window.URL
            : window.webkitURL
          : undefined;
      if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
        console.log(
          "warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available."
        );
        Module.noImageDecoding = true;
      }
      var imagePlugin = {};
      imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
        return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
      };
      imagePlugin["handle"] = function imagePlugin_handle(
        byteArray,
        name,
        onload,
        onerror
      ) {
        var b = null;
        if (Browser.hasBlobConstructor) {
          try {
            b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            if (b.size !== byteArray.length) {
              b = new Blob([new Uint8Array(byteArray).buffer], {
                type: Browser.getMimetype(name),
              });
            }
          } catch (e) {
            warnOnce(
              "Blob constructor present but fails: " +
                e +
                "; falling back to blob builder"
            );
          }
        }
        if (!b) {
          var bb = new Browser.BlobBuilder();
          bb.append(new Uint8Array(byteArray).buffer);
          b = bb.getBlob();
        }
        var url = Browser.URLObject.createObjectURL(b);
        var img = new Image();
        img.onload = function img_onload() {
          assert(img.complete, "Image " + name + " could not be decoded");
          var canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          Module["preloadedImages"][name] = canvas;
          Browser.URLObject.revokeObjectURL(url);
          if (onload) onload(byteArray);
        };
        img.onerror = function img_onerror(event) {
          console.log("Image " + url + " could not be decoded");
          if (onerror) onerror();
        };
        img.src = url;
      };
      Module["preloadPlugins"].push(imagePlugin);
      var audioPlugin = {};
      audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
        return (
          !Module.noAudioDecoding &&
          name.substr(-4) in { ".ogg": 1, ".wav": 1, ".mp3": 1 }
        );
      };
      audioPlugin["handle"] = function audioPlugin_handle(
        byteArray,
        name,
        onload,
        onerror
      ) {
        var done = false;
        function finish(audio) {
          if (done) return;
          done = true;
          Module["preloadedAudios"][name] = audio;
          if (onload) onload(byteArray);
        }
        function fail() {
          if (done) return;
          done = true;
          Module["preloadedAudios"][name] = new Audio();
          if (onerror) onerror();
        }
        if (Browser.hasBlobConstructor) {
          try {
            var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
          } catch (e) {
            return fail();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var audio = new Audio();
          audio.addEventListener(
            "canplaythrough",
            function () {
              finish(audio);
            },
            false
          );
          audio.onerror = function audio_onerror(event) {
            if (done) return;
            console.log(
              "warning: browser could not fully decode audio " +
                name +
                ", trying slower base64 approach"
            );
            function encode64(data) {
              var BASE =
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
              var PAD = "=";
              var ret = "";
              var leftchar = 0;
              var leftbits = 0;
              for (var i = 0; i < data.length; i++) {
                leftchar = (leftchar << 8) | data[i];
                leftbits += 8;
                while (leftbits >= 6) {
                  var curr = (leftchar >> (leftbits - 6)) & 63;
                  leftbits -= 6;
                  ret += BASE[curr];
                }
              }
              if (leftbits == 2) {
                ret += BASE[(leftchar & 3) << 4];
                ret += PAD + PAD;
              } else if (leftbits == 4) {
                ret += BASE[(leftchar & 15) << 2];
                ret += PAD;
              }
              return ret;
            }
            audio.src =
              "data:audio/x-" +
              name.substr(-3) +
              ";base64," +
              encode64(byteArray);
            finish(audio);
          };
          audio.src = url;
          Browser.safeSetTimeout(function () {
            finish(audio);
          }, 1e4);
        } else {
          return fail();
        }
      };
      Module["preloadPlugins"].push(audioPlugin);
      function pointerLockChange() {
        Browser.pointerLock =
          document["pointerLockElement"] === Module["canvas"] ||
          document["mozPointerLockElement"] === Module["canvas"] ||
          document["webkitPointerLockElement"] === Module["canvas"] ||
          document["msPointerLockElement"] === Module["canvas"];
      }
      var canvas = Module["canvas"];
      if (canvas) {
        canvas.requestPointerLock =
          canvas["requestPointerLock"] ||
          canvas["mozRequestPointerLock"] ||
          canvas["webkitRequestPointerLock"] ||
          canvas["msRequestPointerLock"] ||
          function () {};
        canvas.exitPointerLock =
          document["exitPointerLock"] ||
          document["mozExitPointerLock"] ||
          document["webkitExitPointerLock"] ||
          document["msExitPointerLock"] ||
          function () {};
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        document.addEventListener(
          "pointerlockchange",
          pointerLockChange,
          false
        );
        document.addEventListener(
          "mozpointerlockchange",
          pointerLockChange,
          false
        );
        document.addEventListener(
          "webkitpointerlockchange",
          pointerLockChange,
          false
        );
        document.addEventListener(
          "mspointerlockchange",
          pointerLockChange,
          false
        );
        if (Module["elementPointerLock"]) {
          canvas.addEventListener(
            "click",
            function (ev) {
              if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
                Module["canvas"].requestPointerLock();
                ev.preventDefault();
              }
            },
            false
          );
        }
      }
    },
    createContext: function (
      canvas,
      useWebGL,
      setInModule,
      webGLContextAttributes
    ) {
      if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
      var ctx;
      var contextHandle;
      if (useWebGL) {
        var contextAttributes = { antialias: false, alpha: false };
        if (webGLContextAttributes) {
          for (var attribute in webGLContextAttributes) {
            contextAttributes[attribute] = webGLContextAttributes[attribute];
          }
        }
        contextHandle = GL.createContext(canvas, contextAttributes);
        if (contextHandle) {
          ctx = GL.getContext(contextHandle).GLctx;
        }
      } else {
        ctx = canvas.getContext("2d");
      }
      if (!ctx) return null;
      if (setInModule) {
        if (!useWebGL)
          assert(
            typeof GLctx === "undefined",
            "cannot set in module if GLctx is used, but we are a non-GL context that would replace it"
          );
        Module.ctx = ctx;
        if (useWebGL) GL.makeContextCurrent(contextHandle);
        Module.useWebGL = useWebGL;
        Browser.moduleContextCreatedCallbacks.forEach(function (callback) {
          callback();
        });
        Browser.init();
      }
      return ctx;
    },
    destroyContext: function (canvas, useWebGL, setInModule) {},
    fullscreenHandlersInstalled: false,
    lockPointer: undefined,
    resizeCanvas: undefined,
    requestFullscreen: function (lockPointer, resizeCanvas, vrDevice) {
      Browser.lockPointer = lockPointer;
      Browser.resizeCanvas = resizeCanvas;
      Browser.vrDevice = vrDevice;
      if (typeof Browser.lockPointer === "undefined")
        Browser.lockPointer = true;
      if (typeof Browser.resizeCanvas === "undefined")
        Browser.resizeCanvas = false;
      if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
      var canvas = Module["canvas"];
      function fullscreenChange() {
        Browser.isFullscreen = false;
        var canvasContainer = canvas.parentNode;
        if (
          (document["fullscreenElement"] ||
            document["mozFullScreenElement"] ||
            document["msFullscreenElement"] ||
            document["webkitFullscreenElement"] ||
            document["webkitCurrentFullScreenElement"]) === canvasContainer
        ) {
          canvas.exitFullscreen =
            document["exitFullscreen"] ||
            document["cancelFullScreen"] ||
            document["mozCancelFullScreen"] ||
            document["msExitFullscreen"] ||
            document["webkitCancelFullScreen"] ||
            function () {};
          canvas.exitFullscreen = canvas.exitFullscreen.bind(document);
          if (Browser.lockPointer) canvas.requestPointerLock();
          Browser.isFullscreen = true;
          if (Browser.resizeCanvas) Browser.setFullscreenCanvasSize();
        } else {
          canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
          canvasContainer.parentNode.removeChild(canvasContainer);
          if (Browser.resizeCanvas) Browser.setWindowedCanvasSize();
        }
        if (Module["onFullScreen"])
          Module["onFullScreen"](Browser.isFullscreen);
        if (Module["onFullscreen"])
          Module["onFullscreen"](Browser.isFullscreen);
        Browser.updateCanvasDimensions(canvas);
      }
      if (!Browser.fullscreenHandlersInstalled) {
        Browser.fullscreenHandlersInstalled = true;
        document.addEventListener("fullscreenchange", fullscreenChange, false);
        document.addEventListener(
          "mozfullscreenchange",
          fullscreenChange,
          false
        );
        document.addEventListener(
          "webkitfullscreenchange",
          fullscreenChange,
          false
        );
        document.addEventListener(
          "MSFullscreenChange",
          fullscreenChange,
          false
        );
      }
      var canvasContainer = document.createElement("div");
      canvas.parentNode.insertBefore(canvasContainer, canvas);
      canvasContainer.appendChild(canvas);
      canvasContainer.requestFullscreen =
        canvasContainer["requestFullscreen"] ||
        canvasContainer["mozRequestFullScreen"] ||
        canvasContainer["msRequestFullscreen"] ||
        (canvasContainer["webkitRequestFullscreen"]
          ? function () {
              canvasContainer["webkitRequestFullscreen"](
                Element["ALLOW_KEYBOARD_INPUT"]
              );
            }
          : null) ||
        (canvasContainer["webkitRequestFullScreen"]
          ? function () {
              canvasContainer["webkitRequestFullScreen"](
                Element["ALLOW_KEYBOARD_INPUT"]
              );
            }
          : null);
      if (vrDevice) {
        canvasContainer.requestFullscreen({ vrDisplay: vrDevice });
      } else {
        canvasContainer.requestFullscreen();
      }
    },
    requestFullScreen: function (lockPointer, resizeCanvas, vrDevice) {
      Module.printErr(
        "Browser.requestFullScreen() is deprecated. Please call Browser.requestFullscreen instead."
      );
      Browser.requestFullScreen = function (
        lockPointer,
        resizeCanvas,
        vrDevice
      ) {
        return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice);
      };
      return Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice);
    },
    nextRAF: 0,
    fakeRequestAnimationFrame: function (func) {
      var now = Date.now();
      if (Browser.nextRAF === 0) {
        Browser.nextRAF = now + 1e3 / 60;
      } else {
        while (now + 2 >= Browser.nextRAF) {
          Browser.nextRAF += 1e3 / 60;
        }
      }
      var delay = Math.max(Browser.nextRAF - now, 0);
      setTimeout(func, delay);
    },
    requestAnimationFrame: function requestAnimationFrame(func) {
      if (typeof window === "undefined") {
        Browser.fakeRequestAnimationFrame(func);
      } else {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame =
            window["requestAnimationFrame"] ||
            window["mozRequestAnimationFrame"] ||
            window["webkitRequestAnimationFrame"] ||
            window["msRequestAnimationFrame"] ||
            window["oRequestAnimationFrame"] ||
            Browser.fakeRequestAnimationFrame;
        }
        window.requestAnimationFrame(func);
      }
    },
    safeCallback: function (func) {
      return function () {
        if (!ABORT) return func.apply(null, arguments);
      };
    },
    allowAsyncCallbacks: true,
    queuedAsyncCallbacks: [],
    pauseAsyncCallbacks: function () {
      Browser.allowAsyncCallbacks = false;
    },
    resumeAsyncCallbacks: function () {
      Browser.allowAsyncCallbacks = true;
      if (Browser.queuedAsyncCallbacks.length > 0) {
        var callbacks = Browser.queuedAsyncCallbacks;
        Browser.queuedAsyncCallbacks = [];
        callbacks.forEach(function (func) {
          func();
        });
      }
    },
    safeRequestAnimationFrame: function (func) {
      return Browser.requestAnimationFrame(function () {
        if (ABORT) return;
        if (Browser.allowAsyncCallbacks) {
          func();
        } else {
          Browser.queuedAsyncCallbacks.push(func);
        }
      });
    },
    safeSetTimeout: function (func, timeout) {
      Module["noExitRuntime"] = true;
      return setTimeout(function () {
        if (ABORT) return;
        if (Browser.allowAsyncCallbacks) {
          func();
        } else {
          Browser.queuedAsyncCallbacks.push(func);
        }
      }, timeout);
    },
    safeSetInterval: function (func, timeout) {
      Module["noExitRuntime"] = true;
      return setInterval(function () {
        if (ABORT) return;
        if (Browser.allowAsyncCallbacks) {
          func();
        }
      }, timeout);
    },
    getMimetype: function (name) {
      return {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        bmp: "image/bmp",
        ogg: "audio/ogg",
        wav: "audio/wav",
        mp3: "audio/mpeg",
      }[name.substr(name.lastIndexOf(".") + 1)];
    },
    getUserMedia: function (func) {
      if (!window.getUserMedia) {
        window.getUserMedia =
          navigator["getUserMedia"] || navigator["mozGetUserMedia"];
      }
      window.getUserMedia(func);
    },
    getMovementX: function (event) {
      return (
        event["movementX"] ||
        event["mozMovementX"] ||
        event["webkitMovementX"] ||
        0
      );
    },
    getMovementY: function (event) {
      return (
        event["movementY"] ||
        event["mozMovementY"] ||
        event["webkitMovementY"] ||
        0
      );
    },
    getMouseWheelDelta: function (event) {
      var delta = 0;
      switch (event.type) {
        case "DOMMouseScroll":
          delta = event.detail;
          break;
        case "mousewheel":
          delta = event.wheelDelta;
          break;
        case "wheel":
          delta = event["deltaY"];
          break;
        default:
          throw "unrecognized mouse wheel event: " + event.type;
      }
      return delta;
    },
    mouseX: 0,
    mouseY: 0,
    mouseMovementX: 0,
    mouseMovementY: 0,
    touches: {},
    lastTouches: {},
    calculateMouseEvent: function (event) {
      if (Browser.pointerLock) {
        if (event.type != "mousemove" && "mozMovementX" in event) {
          Browser.mouseMovementX = Browser.mouseMovementY = 0;
        } else {
          Browser.mouseMovementX = Browser.getMovementX(event);
          Browser.mouseMovementY = Browser.getMovementY(event);
        }
        if (typeof SDL != "undefined") {
          Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
        } else {
          Browser.mouseX += Browser.mouseMovementX;
          Browser.mouseY += Browser.mouseMovementY;
        }
      } else {
        var rect = Module["canvas"].getBoundingClientRect();
        var cw = Module["canvas"].width;
        var ch = Module["canvas"].height;
        var scrollX =
          typeof window.scrollX !== "undefined"
            ? window.scrollX
            : window.pageXOffset;
        var scrollY =
          typeof window.scrollY !== "undefined"
            ? window.scrollY
            : window.pageYOffset;
        if (
          event.type === "touchstart" ||
          event.type === "touchend" ||
          event.type === "touchmove"
        ) {
          var touch = event.touch;
          if (touch === undefined) {
            return;
          }
          var adjustedX = touch.pageX - (scrollX + rect.left);
          var adjustedY = touch.pageY - (scrollY + rect.top);
          adjustedX = adjustedX * (cw / rect.width);
          adjustedY = adjustedY * (ch / rect.height);
          var coords = { x: adjustedX, y: adjustedY };
          if (event.type === "touchstart") {
            Browser.lastTouches[touch.identifier] = coords;
            Browser.touches[touch.identifier] = coords;
          } else if (event.type === "touchend" || event.type === "touchmove") {
            var last = Browser.touches[touch.identifier];
            if (!last) last = coords;
            Browser.lastTouches[touch.identifier] = last;
            Browser.touches[touch.identifier] = coords;
          }
          return;
        }
        var x = event.pageX - (scrollX + rect.left);
        var y = event.pageY - (scrollY + rect.top);
        x = x * (cw / rect.width);
        y = y * (ch / rect.height);
        Browser.mouseMovementX = x - Browser.mouseX;
        Browser.mouseMovementY = y - Browser.mouseY;
        Browser.mouseX = x;
        Browser.mouseY = y;
      }
    },
    asyncLoad: function (url, onload, onerror, noRunDep) {
      var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
      Module["readAsync"](
        url,
        function (arrayBuffer) {
          assert(
            arrayBuffer,
            'Loading data file "' + url + '" failed (no arrayBuffer).'
          );
          onload(new Uint8Array(arrayBuffer));
          if (dep) removeRunDependency(dep);
        },
        function (event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        }
      );
      if (dep) addRunDependency(dep);
    },
    resizeListeners: [],
    updateResizeListeners: function () {
      var canvas = Module["canvas"];
      Browser.resizeListeners.forEach(function (listener) {
        listener(canvas.width, canvas.height);
      });
    },
    setCanvasSize: function (width, height, noUpdates) {
      var canvas = Module["canvas"];
      Browser.updateCanvasDimensions(canvas, width, height);
      if (!noUpdates) Browser.updateResizeListeners();
    },
    windowedWidth: 0,
    windowedHeight: 0,
    setFullscreenCanvasSize: function () {
      if (typeof SDL != "undefined") {
        var flags = HEAPU32[SDL.screen >> 2];
        flags = flags | 8388608;
        HEAP32[SDL.screen >> 2] = flags;
      }
      Browser.updateResizeListeners();
    },
    setWindowedCanvasSize: function () {
      if (typeof SDL != "undefined") {
        var flags = HEAPU32[SDL.screen >> 2];
        flags = flags & ~8388608;
        HEAP32[SDL.screen >> 2] = flags;
      }
      Browser.updateResizeListeners();
    },
    updateCanvasDimensions: function (canvas, wNative, hNative) {
      if (wNative && hNative) {
        canvas.widthNative = wNative;
        canvas.heightNative = hNative;
      } else {
        wNative = canvas.widthNative;
        hNative = canvas.heightNative;
      }
      var w = wNative;
      var h = hNative;
      if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
        if (w / h < Module["forcedAspectRatio"]) {
          w = Math.round(h * Module["forcedAspectRatio"]);
        } else {
          h = Math.round(w / Module["forcedAspectRatio"]);
        }
      }
      if (
        (document["fullscreenElement"] ||
          document["mozFullScreenElement"] ||
          document["msFullscreenElement"] ||
          document["webkitFullscreenElement"] ||
          document["webkitCurrentFullScreenElement"]) === canvas.parentNode &&
        typeof screen != "undefined"
      ) {
        var factor = Math.min(screen.width / w, screen.height / h);
        w = Math.round(w * factor);
        h = Math.round(h * factor);
      }
      if (Browser.resizeCanvas) {
        if (canvas.width != w) canvas.width = w;
        if (canvas.height != h) canvas.height = h;
        if (typeof canvas.style != "undefined") {
          canvas.style.removeProperty("width");
          canvas.style.removeProperty("height");
        }
      } else {
        if (canvas.width != wNative) canvas.width = wNative;
        if (canvas.height != hNative) canvas.height = hNative;
        if (typeof canvas.style != "undefined") {
          if (w != wNative || h != hNative) {
            canvas.style.setProperty("width", w + "px", "important");
            canvas.style.setProperty("height", h + "px", "important");
          } else {
            canvas.style.removeProperty("width");
            canvas.style.removeProperty("height");
          }
        }
      }
    },
    wgetRequests: {},
    nextWgetRequestHandle: 0,
    getNextWgetRequestHandle: function () {
      var handle = Browser.nextWgetRequestHandle;
      Browser.nextWgetRequestHandle++;
      return handle;
    },
  };
  function _emscripten_set_main_loop_timing(mode, value) {
    Browser.mainLoop.timingMode = mode;
    Browser.mainLoop.timingValue = value;
    if (!Browser.mainLoop.func) {
      return 1;
    }
    if (mode == 0) {
      Browser.mainLoop.scheduler =
        function Browser_mainLoop_scheduler_setTimeout() {
          var timeUntilNextTick =
            Math.max(
              0,
              Browser.mainLoop.tickStartTime + value - _emscripten_get_now()
            ) | 0;
          setTimeout(Browser.mainLoop.runner, timeUntilNextTick);
        };
      Browser.mainLoop.method = "timeout";
    } else if (mode == 1) {
      Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
        Browser.requestAnimationFrame(Browser.mainLoop.runner);
      };
      Browser.mainLoop.method = "rAF";
    } else if (mode == 2) {
      if (typeof setImmediate === "undefined") {
        var setImmediates = [];
        var emscriptenMainLoopMessageId = "setimmediate";
        function Browser_setImmediate_messageHandler(event) {
          if (
            event.data === emscriptenMainLoopMessageId ||
            event.data.target === emscriptenMainLoopMessageId
          ) {
            event.stopPropagation();
            setImmediates.shift()();
          }
        }
        addEventListener("message", Browser_setImmediate_messageHandler, true);
        setImmediate = function Browser_emulated_setImmediate(func) {
          setImmediates.push(func);
          if (ENVIRONMENT_IS_WORKER) {
            if (Module["setImmediates"] === undefined)
              Module["setImmediates"] = [];
            Module["setImmediates"].push(func);
            postMessage({ target: emscriptenMainLoopMessageId });
          } else postMessage(emscriptenMainLoopMessageId, "*");
        };
      }
      Browser.mainLoop.scheduler =
        function Browser_mainLoop_scheduler_setImmediate() {
          setImmediate(Browser.mainLoop.runner);
        };
      Browser.mainLoop.method = "immediate";
    }
    return 0;
  }
  function _emscripten_get_now() {
    abort();
  }
  function _emscripten_set_main_loop(
    func,
    fps,
    simulateInfiniteLoop,
    arg,
    noSetTiming
  ) {
    Module["noExitRuntime"] = true;
    assert(
      !Browser.mainLoop.func,
      "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters."
    );
    Browser.mainLoop.func = func;
    Browser.mainLoop.arg = arg;
    var browserIterationFunc;
    if (typeof arg !== "undefined") {
      browserIterationFunc = function () {
        Module["dynCall_vi"](func, arg);
      };
    } else {
      browserIterationFunc = function () {
        Module["dynCall_v"](func);
      };
    }
    var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
    Browser.mainLoop.runner = function Browser_mainLoop_runner() {
      if (ABORT) return;
      if (Browser.mainLoop.queue.length > 0) {
        var start = Date.now();
        var blocker = Browser.mainLoop.queue.shift();
        blocker.func(blocker.arg);
        if (Browser.mainLoop.remainingBlockers) {
          var remaining = Browser.mainLoop.remainingBlockers;
          var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
          if (blocker.counted) {
            Browser.mainLoop.remainingBlockers = next;
          } else {
            next = next + 0.5;
            Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
          }
        }
        console.log(
          'main loop blocker "' +
            blocker.name +
            '" took ' +
            (Date.now() - start) +
            " ms"
        );
        Browser.mainLoop.updateStatus();
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
        setTimeout(Browser.mainLoop.runner, 0);
        return;
      }
      if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
      Browser.mainLoop.currentFrameNumber =
        (Browser.mainLoop.currentFrameNumber + 1) | 0;
      if (
        Browser.mainLoop.timingMode == 1 &&
        Browser.mainLoop.timingValue > 1 &&
        Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0
      ) {
        Browser.mainLoop.scheduler();
        return;
      } else if (Browser.mainLoop.timingMode == 0) {
        Browser.mainLoop.tickStartTime = _emscripten_get_now();
      }
      if (Browser.mainLoop.method === "timeout" && Module.ctx) {
        Module.printErr(
          "Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!"
        );
        Browser.mainLoop.method = "";
      }
      Browser.mainLoop.runIter(browserIterationFunc);
      if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
      if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData)
        SDL.audio.queueNewAudioData();
      Browser.mainLoop.scheduler();
    };
    if (!noSetTiming) {
      if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
      else _emscripten_set_main_loop_timing(1, 1);
      Browser.mainLoop.scheduler();
    }
    if (simulateInfiniteLoop) {
      throw "SimulateInfiniteLoop";
    }
  }
  var GL = {
    counter: 1,
    lastError: 0,
    buffers: [],
    mappedBuffers: {},
    programs: [],
    framebuffers: [],
    renderbuffers: [],
    textures: [],
    uniforms: [],
    shaders: [],
    vaos: [],
    contexts: [],
    currentContext: null,
    offscreenCanvases: {},
    timerQueriesEXT: [],
    byteSizeByTypeRoot: 5120,
    byteSizeByType: [1, 1, 2, 2, 4, 4, 4, 2, 3, 4, 8],
    programInfos: {},
    stringCache: {},
    tempFixedLengthArray: [],
    packAlignment: 4,
    unpackAlignment: 4,
    init: function () {
      GL.miniTempBuffer = new Float32Array(GL.MINI_TEMP_BUFFER_SIZE);
      for (var i = 0; i < GL.MINI_TEMP_BUFFER_SIZE; i++) {
        GL.miniTempBufferViews[i] = GL.miniTempBuffer.subarray(0, i + 1);
      }
      for (var i = 0; i < 32; i++) {
        GL.tempFixedLengthArray.push(new Array(i));
      }
    },
    recordError: function recordError(errorCode) {
      if (!GL.lastError) {
        GL.lastError = errorCode;
      }
    },
    getNewId: function (table) {
      var ret = GL.counter++;
      for (var i = table.length; i < ret; i++) {
        table[i] = null;
      }
      return ret;
    },
    MINI_TEMP_BUFFER_SIZE: 256,
    miniTempBuffer: null,
    miniTempBufferViews: [0],
    getSource: function (shader, count, string, length) {
      var source = "";
      for (var i = 0; i < count; ++i) {
        var frag;
        if (length) {
          var len = HEAP32[(length + i * 4) >> 2];
          if (len < 0) {
            frag = Pointer_stringify(HEAP32[(string + i * 4) >> 2]);
          } else {
            frag = Pointer_stringify(HEAP32[(string + i * 4) >> 2], len);
          }
        } else {
          frag = Pointer_stringify(HEAP32[(string + i * 4) >> 2]);
        }
        source += frag;
      }
      return source;
    },
    createContext: function (canvas, webGLContextAttributes) {
      if (
        typeof webGLContextAttributes["majorVersion"] === "undefined" &&
        typeof webGLContextAttributes["minorVersion"] === "undefined"
      ) {
        webGLContextAttributes["majorVersion"] = 1;
        webGLContextAttributes["minorVersion"] = 0;
      }
      var ctx;
      var errorInfo = "?";
      function onContextCreationError(event) {
        errorInfo = event.statusMessage || errorInfo;
      }
      try {
        canvas.addEventListener(
          "webglcontextcreationerror",
          onContextCreationError,
          false
        );
        try {
          if (
            webGLContextAttributes["majorVersion"] == 1 &&
            webGLContextAttributes["minorVersion"] == 0
          ) {
            ctx =
              canvas.getContext("webgl", webGLContextAttributes) ||
              canvas.getContext("experimental-webgl", webGLContextAttributes);
          } else if (
            webGLContextAttributes["majorVersion"] == 2 &&
            webGLContextAttributes["minorVersion"] == 0
          ) {
            ctx = canvas.getContext("webgl2", webGLContextAttributes);
          } else {
            throw (
              "Unsupported WebGL context version " +
              majorVersion +
              "." +
              minorVersion +
              "!"
            );
          }
        } finally {
          canvas.removeEventListener(
            "webglcontextcreationerror",
            onContextCreationError,
            false
          );
        }
        if (!ctx) throw ":(";
      } catch (e) {
        Module.print(
          "Could not create canvas: " +
            [errorInfo, e, JSON.stringify(webGLContextAttributes)]
        );
        return 0;
      }
      if (!ctx) return 0;
      var context = GL.registerContext(ctx, webGLContextAttributes);
      return context;
    },
    registerContext: function (ctx, webGLContextAttributes) {
      var handle = GL.getNewId(GL.contexts);
      var context = {
        handle: handle,
        attributes: webGLContextAttributes,
        version: webGLContextAttributes["majorVersion"],
        GLctx: ctx,
      };
      if (ctx.canvas) ctx.canvas.GLctxObject = context;
      GL.contexts[handle] = context;
      if (
        typeof webGLContextAttributes["enableExtensionsByDefault"] ===
          "undefined" ||
        webGLContextAttributes["enableExtensionsByDefault"]
      ) {
        GL.initExtensions(context);
      }
      return handle;
    },
    makeContextCurrent: function (contextHandle) {
      var context = GL.contexts[contextHandle];
      if (!context) return false;
      GLctx = Module.ctx = context.GLctx;
      GL.currentContext = context;
      return true;
    },
    getContext: function (contextHandle) {
      return GL.contexts[contextHandle];
    },
    deleteContext: function (contextHandle) {
      if (GL.currentContext === GL.contexts[contextHandle])
        GL.currentContext = null;
      if (typeof JSEvents === "object")
        JSEvents.removeAllHandlersOnTarget(
          GL.contexts[contextHandle].GLctx.canvas
        );
      if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas)
        GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
      GL.contexts[contextHandle] = null;
    },
    initExtensions: function (context) {
      if (!context) context = GL.currentContext;
      if (context.initExtensionsDone) return;
      context.initExtensionsDone = true;
      var GLctx = context.GLctx;
      context.maxVertexAttribs = GLctx.getParameter(GLctx.MAX_VERTEX_ATTRIBS);
      if (context.version < 2) {
        var instancedArraysExt = GLctx.getExtension("ANGLE_instanced_arrays");
        if (instancedArraysExt) {
          GLctx["vertexAttribDivisor"] = function (index, divisor) {
            instancedArraysExt["vertexAttribDivisorANGLE"](index, divisor);
          };
          GLctx["drawArraysInstanced"] = function (
            mode,
            first,
            count,
            primcount
          ) {
            instancedArraysExt["drawArraysInstancedANGLE"](
              mode,
              first,
              count,
              primcount
            );
          };
          GLctx["drawElementsInstanced"] = function (
            mode,
            count,
            type,
            indices,
            primcount
          ) {
            instancedArraysExt["drawElementsInstancedANGLE"](
              mode,
              count,
              type,
              indices,
              primcount
            );
          };
        }
        var vaoExt = GLctx.getExtension("OES_vertex_array_object");
        if (vaoExt) {
          GLctx["createVertexArray"] = function () {
            return vaoExt["createVertexArrayOES"]();
          };
          GLctx["deleteVertexArray"] = function (vao) {
            vaoExt["deleteVertexArrayOES"](vao);
          };
          GLctx["bindVertexArray"] = function (vao) {
            vaoExt["bindVertexArrayOES"](vao);
          };
          GLctx["isVertexArray"] = function (vao) {
            return vaoExt["isVertexArrayOES"](vao);
          };
        }
        var drawBuffersExt = GLctx.getExtension("WEBGL_draw_buffers");
        if (drawBuffersExt) {
          GLctx["drawBuffers"] = function (n, bufs) {
            drawBuffersExt["drawBuffersWEBGL"](n, bufs);
          };
        }
      }
      GLctx.disjointTimerQueryExt = GLctx.getExtension(
        "EXT_disjoint_timer_query"
      );
      var automaticallyEnabledExtensions = [
        "OES_texture_float",
        "OES_texture_half_float",
        "OES_standard_derivatives",
        "OES_vertex_array_object",
        "WEBGL_compressed_texture_s3tc",
        "WEBGL_depth_texture",
        "OES_element_index_uint",
        "EXT_texture_filter_anisotropic",
        "ANGLE_instanced_arrays",
        "OES_texture_float_linear",
        "OES_texture_half_float_linear",
        "WEBGL_compressed_texture_atc",
        "WEBKIT_WEBGL_compressed_texture_pvrtc",
        "WEBGL_compressed_texture_pvrtc",
        "EXT_color_buffer_half_float",
        "WEBGL_color_buffer_float",
        "EXT_frag_depth",
        "EXT_sRGB",
        "WEBGL_draw_buffers",
        "WEBGL_shared_resources",
        "EXT_shader_texture_lod",
        "EXT_color_buffer_float",
      ];
      var exts = GLctx.getSupportedExtensions();
      if (exts && exts.length > 0) {
        GLctx.getSupportedExtensions().forEach(function (ext) {
          if (automaticallyEnabledExtensions.indexOf(ext) != -1) {
            GLctx.getExtension(ext);
          }
        });
      }
    },
    populateUniformTable: function (program) {
      var p = GL.programs[program];
      GL.programInfos[program] = {
        uniforms: {},
        maxUniformLength: 0,
        maxAttributeLength: -1,
        maxUniformBlockNameLength: -1,
      };
      var ptable = GL.programInfos[program];
      var utable = ptable.uniforms;
      var numUniforms = GLctx.getProgramParameter(p, GLctx.ACTIVE_UNIFORMS);
      for (var i = 0; i < numUniforms; ++i) {
        var u = GLctx.getActiveUniform(p, i);
        var name = u.name;
        ptable.maxUniformLength = Math.max(
          ptable.maxUniformLength,
          name.length + 1
        );
        if (name.indexOf("]", name.length - 1) !== -1) {
          var ls = name.lastIndexOf("[");
          name = name.slice(0, ls);
        }
        var loc = GLctx.getUniformLocation(p, name);
        if (loc != null) {
          var id = GL.getNewId(GL.uniforms);
          utable[name] = [u.size, id];
          GL.uniforms[id] = loc;
          for (var j = 1; j < u.size; ++j) {
            var n = name + "[" + j + "]";
            loc = GLctx.getUniformLocation(p, n);
            id = GL.getNewId(GL.uniforms);
            GL.uniforms[id] = loc;
          }
        }
      }
    },
  };
  function _glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
  }
  function _glBindBuffer(target, buffer) {
    var bufferObj = buffer ? GL.buffers[buffer] : null;
    GLctx.bindBuffer(target, bufferObj);
  }
  function _glBlendFunc(x0, x1) {
    GLctx["blendFunc"](x0, x1);
  }
  function _glBufferData(target, size, data, usage) {
    if (!data) {
      GLctx.bufferData(target, size, usage);
    } else {
      GLctx.bufferData(target, HEAPU8.subarray(data, data + size), usage);
    }
  }
  function _glClear(x0) {
    GLctx["clear"](x0);
  }
  function _glClearColor(x0, x1, x2, x3) {
    GLctx["clearColor"](x0, x1, x2, x3);
  }
  function _glColorMask(red, green, blue, alpha) {
    GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
  }
  function _glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader]);
  }
  function _glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    program.name = id;
    GL.programs[id] = program;
    return id;
  }
  function _glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);
    return id;
  }
  function _glDisable(x0) {
    GLctx["disable"](x0);
  }
  function _glDrawArrays(mode, first, count) {
    GLctx.drawArrays(mode, first, count);
  }
  function _glEnable(x0) {
    GLctx["enable"](x0);
  }
  function _glEnableVertexAttribArray(index) {
    GLctx.enableVertexAttribArray(index);
  }
  function _glFrontFace(x0) {
    GLctx["frontFace"](x0);
  }
  function _glGenBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
      var buffer = GLctx.createBuffer();
      if (!buffer) {
        GL.recordError(1282);
        while (i < n) HEAP32[(buffers + i++ * 4) >> 2] = 0;
        return;
      }
      var id = GL.getNewId(GL.buffers);
      buffer.name = id;
      GL.buffers[id] = buffer;
      HEAP32[(buffers + i * 4) >> 2] = id;
    }
  }
  function _glGetUniformLocation(program, name) {
    name = Pointer_stringify(name);
    var arrayOffset = 0;
    if (name.indexOf("]", name.length - 1) !== -1) {
      var ls = name.lastIndexOf("[");
      var arrayIndex = name.slice(ls + 1, -1);
      if (arrayIndex.length > 0) {
        arrayOffset = parseInt(arrayIndex);
        if (arrayOffset < 0) {
          return -1;
        }
      }
      name = name.slice(0, ls);
    }
    var ptable = GL.programInfos[program];
    if (!ptable) {
      return -1;
    }
    var utable = ptable.uniforms;
    var uniformInfo = utable[name];
    if (uniformInfo && arrayOffset < uniformInfo[0]) {
      return uniformInfo[1] + arrayOffset;
    } else {
      return -1;
    }
  }
  function _glLinkProgram(program) {
    GLctx.linkProgram(GL.programs[program]);
    GL.programInfos[program] = null;
    GL.populateUniformTable(program);
  }
  function _glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);
    GLctx.shaderSource(GL.shaders[shader], source);
  }
  function _glStencilFunc(x0, x1, x2) {
    GLctx["stencilFunc"](x0, x1, x2);
  }
  function _glStencilOp(x0, x1, x2) {
    GLctx["stencilOp"](x0, x1, x2);
  }
  function _glUniform3f(location, v0, v1, v2) {
    GLctx.uniform3f(GL.uniforms[location], v0, v1, v2);
  }
  function _glUniform4f(location, v0, v1, v2, v3) {
    GLctx.uniform4f(GL.uniforms[location], v0, v1, v2, v3);
  }
  function _glUniformMatrix4fv(location, count, transpose, value) {
    var view;
    if (16 * count <= GL.MINI_TEMP_BUFFER_SIZE) {
      view = GL.miniTempBufferViews[16 * count - 1];
      for (var i = 0; i < 16 * count; i += 16) {
        view[i] = HEAPF32[(value + 4 * i) >> 2];
        view[i + 1] = HEAPF32[(value + (4 * i + 4)) >> 2];
        view[i + 2] = HEAPF32[(value + (4 * i + 8)) >> 2];
        view[i + 3] = HEAPF32[(value + (4 * i + 12)) >> 2];
        view[i + 4] = HEAPF32[(value + (4 * i + 16)) >> 2];
        view[i + 5] = HEAPF32[(value + (4 * i + 20)) >> 2];
        view[i + 6] = HEAPF32[(value + (4 * i + 24)) >> 2];
        view[i + 7] = HEAPF32[(value + (4 * i + 28)) >> 2];
        view[i + 8] = HEAPF32[(value + (4 * i + 32)) >> 2];
        view[i + 9] = HEAPF32[(value + (4 * i + 36)) >> 2];
        view[i + 10] = HEAPF32[(value + (4 * i + 40)) >> 2];
        view[i + 11] = HEAPF32[(value + (4 * i + 44)) >> 2];
        view[i + 12] = HEAPF32[(value + (4 * i + 48)) >> 2];
        view[i + 13] = HEAPF32[(value + (4 * i + 52)) >> 2];
        view[i + 14] = HEAPF32[(value + (4 * i + 56)) >> 2];
        view[i + 15] = HEAPF32[(value + (4 * i + 60)) >> 2];
      }
    } else {
      view = HEAPF32.subarray(value >> 2, (value + count * 64) >> 2);
    }
    GLctx.uniformMatrix4fv(GL.uniforms[location], !!transpose, view);
  }
  function _glUseProgram(program) {
    GLctx.useProgram(program ? GL.programs[program] : null);
  }
  function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
  }
  function _glViewport(x0, x1, x2, x3) {
    GLctx["viewport"](x0, x1, x2, x3);
  }
  var GLFW = {
    Window: function (id, width, height, title, monitor, share) {
      this.id = id;
      this.x = 0;
      this.y = 0;
      this.fullscreen = false;
      this.storedX = 0;
      this.storedY = 0;
      this.width = width;
      this.height = height;
      this.storedWidth = width;
      this.storedHeight = height;
      this.title = title;
      this.monitor = monitor;
      this.share = share;
      this.attributes = GLFW.hints;
      this.inputModes = { 208897: 212993, 208898: 0, 208899: 0 };
      this.buttons = 0;
      this.keys = new Array();
      this.domKeys = new Array();
      this.shouldClose = 0;
      this.title = null;
      this.windowPosFunc = null;
      this.windowSizeFunc = null;
      this.windowCloseFunc = null;
      this.windowRefreshFunc = null;
      this.windowFocusFunc = null;
      this.windowIconifyFunc = null;
      this.framebufferSizeFunc = null;
      this.mouseButtonFunc = null;
      this.cursorPosFunc = null;
      this.cursorEnterFunc = null;
      this.scrollFunc = null;
      this.dropFunc = null;
      this.keyFunc = null;
      this.charFunc = null;
      this.userptr = null;
    },
    WindowFromId: function (id) {
      if (id <= 0 || !GLFW.windows) return null;
      return GLFW.windows[id - 1];
    },
    joystickFunc: null,
    errorFunc: null,
    monitorFunc: null,
    active: null,
    windows: null,
    monitors: null,
    monitorString: null,
    versionString: null,
    initialTime: null,
    extensions: null,
    hints: null,
    defaultHints: {
      131073: 0,
      131074: 0,
      131075: 1,
      131076: 1,
      131077: 1,
      135169: 8,
      135170: 8,
      135171: 8,
      135172: 8,
      135173: 24,
      135174: 8,
      135175: 0,
      135176: 0,
      135177: 0,
      135178: 0,
      135179: 0,
      135180: 0,
      135181: 0,
      135182: 0,
      135183: 0,
      139265: 196609,
      139266: 1,
      139267: 0,
      139268: 0,
      139269: 0,
      139270: 0,
      139271: 0,
      139272: 0,
    },
    DOMToGLFWKeyCode: function (keycode) {
      switch (keycode) {
        case 32:
          return 32;
        case 222:
          return 39;
        case 188:
          return 44;
        case 173:
          return 45;
        case 189:
          return 45;
        case 190:
          return 46;
        case 191:
          return 47;
        case 48:
          return 48;
        case 49:
          return 49;
        case 50:
          return 50;
        case 51:
          return 51;
        case 52:
          return 52;
        case 53:
          return 53;
        case 54:
          return 54;
        case 55:
          return 55;
        case 56:
          return 56;
        case 57:
          return 57;
        case 59:
          return 59;
        case 61:
          return 61;
        case 187:
          return 61;
        case 65:
          return 65;
        case 66:
          return 66;
        case 67:
          return 67;
        case 68:
          return 68;
        case 69:
          return 69;
        case 70:
          return 70;
        case 71:
          return 71;
        case 72:
          return 72;
        case 73:
          return 73;
        case 74:
          return 74;
        case 75:
          return 75;
        case 76:
          return 76;
        case 77:
          return 77;
        case 78:
          return 78;
        case 79:
          return 79;
        case 80:
          return 80;
        case 81:
          return 81;
        case 82:
          return 82;
        case 83:
          return 83;
        case 84:
          return 84;
        case 85:
          return 85;
        case 86:
          return 86;
        case 87:
          return 87;
        case 88:
          return 88;
        case 89:
          return 89;
        case 90:
          return 90;
        case 219:
          return 91;
        case 220:
          return 92;
        case 221:
          return 93;
        case 192:
          return 94;
        case 27:
          return 256 + 1;
        case 112:
          return 256 + 2;
        case 113:
          return 256 + 3;
        case 114:
          return 256 + 4;
        case 115:
          return 256 + 5;
        case 116:
          return 256 + 6;
        case 117:
          return 256 + 7;
        case 118:
          return 256 + 8;
        case 119:
          return 256 + 9;
        case 120:
          return 256 + 10;
        case 121:
          return 256 + 11;
        case 122:
          return 256 + 12;
        case 123:
          return 256 + 13;
        case 124:
          return 256 + 14;
        case 125:
          return 256 + 15;
        case 126:
          return 256 + 16;
        case 127:
          return 256 + 17;
        case 128:
          return 256 + 18;
        case 129:
          return 256 + 19;
        case 130:
          return 256 + 20;
        case 131:
          return 256 + 21;
        case 132:
          return 256 + 22;
        case 133:
          return 256 + 23;
        case 134:
          return 256 + 24;
        case 135:
          return 256 + 25;
        case 136:
          return 256 + 26;
        case 39:
          return 256 + 30;
        case 37:
          return 256 + 29;
        case 40:
          return 256 + 28;
        case 38:
          return 256 + 27;
        case 16:
          return 256 + 31;
        case 17:
          return 256 + 33;
        case 18:
          return 256 + 35;
        case 9:
          return 256 + 37;
        case 13:
          return 256 + 38;
        case 8:
          return 256 + 39;
        case 45:
          return 256 + 40;
        case 46:
          return 256 + 41;
        case 33:
          return 256 + 42;
        case 34:
          return 256 + 43;
        case 36:
          return 256 + 44;
        case 35:
          return 256 + 45;
        case 96:
          return 256 + 46;
        case 97:
          return 256 + 47;
        case 98:
          return 256 + 48;
        case 99:
          return 256 + 49;
        case 100:
          return 256 + 50;
        case 101:
          return 256 + 51;
        case 102:
          return 256 + 52;
        case 103:
          return 256 + 53;
        case 104:
          return 256 + 54;
        case 105:
          return 256 + 55;
        case 111:
          return 256 + 56;
        case 106:
          return 256 + 57;
        case 109:
          return 256 + 58;
        case 107:
          return 256 + 59;
        case 110:
          return 256 + 60;
        case 144:
          return 256 + 63;
        case 20:
          return 256 + 64;
        case 145:
          return 256 + 65;
        case 19:
          return 256 + 66;
        case 91:
          return 256 + 67;
        case 93:
          return 256 + 69;
        default:
          return -1;
      }
    },
    getModBits: function (win) {
      var mod = 0;
      if (win.keys[340]) mod |= 1;
      if (win.keys[341]) mod |= 2;
      if (win.keys[342]) mod |= 4;
      if (win.keys[343]) mod |= 8;
      return mod;
    },
    onKeyPress: function (event) {
      if (!GLFW.active || !GLFW.active.charFunc) return;
      if (event.ctrlKey || event.metaKey) return;
      var charCode = event.charCode;
      if (charCode == 0 || (charCode >= 0 && charCode <= 31)) return;
      Module["dynCall_vii"](GLFW.active.charFunc, charCode, 1);
    },
    onKeyChanged: function (keyCode, status) {
      if (!GLFW.active) return;
      var key = GLFW.DOMToGLFWKeyCode(keyCode);
      if (key == -1) return;
      GLFW.active.keys[key] = status;
      GLFW.active.domKeys[keyCode] = status;
      if (!GLFW.active.keyFunc) return;
      Module["dynCall_vii"](GLFW.active.keyFunc, key, status);
    },
    onGamepadConnected: function (event) {
      GLFW.refreshJoysticks();
    },
    onGamepadDisconnected: function (event) {
      GLFW.refreshJoysticks();
    },
    onKeydown: function (event) {
      GLFW.onKeyChanged(event.keyCode, 1);
      if (event.keyCode === 8 || event.keyCode === 9) {
        event.preventDefault();
      }
    },
    onKeyup: function (event) {
      GLFW.onKeyChanged(event.keyCode, 0);
    },
    onBlur: function (event) {
      if (!GLFW.active) return;
      for (var i = 0; i < GLFW.active.domKeys.length; ++i) {
        if (GLFW.active.domKeys[i]) {
          GLFW.onKeyChanged(i, 0);
        }
      }
    },
    onMousemove: function (event) {
      if (!GLFW.active) return;
      Browser.calculateMouseEvent(event);
      if (event.target != Module["canvas"] || !GLFW.active.cursorPosFunc)
        return;
      Module["dynCall_vii"](
        GLFW.active.cursorPosFunc,
        Browser.mouseX,
        Browser.mouseY
      );
    },
    DOMToGLFWMouseButton: function (event) {
      var eventButton = event["button"];
      if (eventButton > 0) {
        if (eventButton == 1) {
          eventButton = 2;
        } else {
          eventButton = 1;
        }
      }
      return eventButton;
    },
    onMouseenter: function (event) {
      if (!GLFW.active) return;
      if (event.target != Module["canvas"] || !GLFW.active.cursorEnterFunc)
        return;
    },
    onMouseleave: function (event) {
      if (!GLFW.active) return;
      if (event.target != Module["canvas"] || !GLFW.active.cursorEnterFunc)
        return;
    },
    onMouseButtonChanged: function (event, status) {
      if (!GLFW.active) return;
      Browser.calculateMouseEvent(event);
      if (event.target != Module["canvas"]) return;
      var eventButton = GLFW.DOMToGLFWMouseButton(event);
      if (status == 1) {
        GLFW.active.buttons |= 1 << eventButton;
        try {
          event.target.setCapture();
        } catch (e) {}
      } else {
        GLFW.active.buttons &= ~(1 << eventButton);
      }
      if (!GLFW.active.mouseButtonFunc) return;
      Module["dynCall_vii"](GLFW.active.mouseButtonFunc, eventButton, status);
    },
    onMouseButtonDown: function (event) {
      if (!GLFW.active) return;
      GLFW.onMouseButtonChanged(event, 1);
    },
    onMouseButtonUp: function (event) {
      if (!GLFW.active) return;
      GLFW.onMouseButtonChanged(event, 0);
    },
    onMouseWheel: function (event) {
      var delta = -Browser.getMouseWheelDelta(event);
      delta =
        delta == 0 ? 0 : delta > 0 ? Math.max(delta, 1) : Math.min(delta, -1);
      GLFW.wheelPos += delta;
      if (
        !GLFW.active ||
        !GLFW.active.scrollFunc ||
        event.target != Module["canvas"]
      )
        return;
      Module["dynCall_vi"](GLFW.active.scrollFunc, GLFW.wheelPos);
      event.preventDefault();
    },
    onCanvasResize: function (width, height) {
      if (!GLFW.active) return;
      var resizeNeeded = true;
      if (
        document["fullscreen"] ||
        document["fullScreen"] ||
        document["mozFullScreen"] ||
        document["webkitIsFullScreen"]
      ) {
        GLFW.active.storedX = GLFW.active.x;
        GLFW.active.storedY = GLFW.active.y;
        GLFW.active.storedWidth = GLFW.active.width;
        GLFW.active.storedHeight = GLFW.active.height;
        GLFW.active.x = GLFW.active.y = 0;
        GLFW.active.width = screen.width;
        GLFW.active.height = screen.height;
        GLFW.active.fullscreen = true;
      } else if (GLFW.active.fullscreen == true) {
        GLFW.active.x = GLFW.active.storedX;
        GLFW.active.y = GLFW.active.storedY;
        GLFW.active.width = GLFW.active.storedWidth;
        GLFW.active.height = GLFW.active.storedHeight;
        GLFW.active.fullscreen = false;
      } else if (GLFW.active.width != width || GLFW.active.height != height) {
        GLFW.active.width = width;
        GLFW.active.height = height;
      } else {
        resizeNeeded = false;
      }
      if (resizeNeeded) {
        Browser.setCanvasSize(GLFW.active.width, GLFW.active.height, true);
        GLFW.onWindowSizeChanged();
        GLFW.onFramebufferSizeChanged();
      }
    },
    onWindowSizeChanged: function () {
      if (!GLFW.active) return;
      if (!GLFW.active.windowSizeFunc) return;
      Module["dynCall_vii"](
        GLFW.active.windowSizeFunc,
        GLFW.active.width,
        GLFW.active.height
      );
    },
    onFramebufferSizeChanged: function () {
      if (!GLFW.active) return;
      if (!GLFW.active.framebufferSizeFunc) return;
    },
    requestFullscreen: function () {
      var RFS =
        Module["canvas"]["requestFullscreen"] ||
        Module["canvas"]["mozRequestFullScreen"] ||
        Module["canvas"]["webkitRequestFullScreen"] ||
        function () {};
      RFS.apply(Module["canvas"], []);
    },
    requestFullScreen: function () {
      Module.printErr(
        "GLFW.requestFullScreen() is deprecated. Please call GLFW.requestFullscreen instead."
      );
      GLFW.requestFullScreen = function () {
        return GLFW.requestFullscreen();
      };
      return GLFW.requestFullscreen();
    },
    exitFullscreen: function () {
      var CFS =
        document["exitFullscreen"] ||
        document["cancelFullScreen"] ||
        document["mozCancelFullScreen"] ||
        document["webkitCancelFullScreen"] ||
        function () {};
      CFS.apply(document, []);
    },
    cancelFullScreen: function () {
      Module.printErr(
        "GLFW.cancelFullScreen() is deprecated. Please call GLFW.exitFullscreen instead."
      );
      GLFW.cancelFullScreen = function () {
        return GLFW.exitFullscreen();
      };
      return GLFW.exitFullscreen();
    },
    getTime: function () {
      return _emscripten_get_now() / 1e3;
    },
    setWindowTitle: function (winid, title) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.title = Pointer_stringify(title);
      if (GLFW.active.id == win.id) {
        document.title = win.title;
      }
    },
    setJoystickCallback: function (cbfun) {
      GLFW.joystickFunc = cbfun;
      GLFW.refreshJoysticks();
    },
    joys: {},
    lastGamepadState: null,
    lastGamepadStateFrame: null,
    refreshJoysticks: function () {
      if (
        Browser.mainLoop.currentFrameNumber !== GLFW.lastGamepadStateFrame ||
        !Browser.mainLoop.currentFrameNumber
      ) {
        GLFW.lastGamepadState = navigator.getGamepads
          ? navigator.getGamepads()
          : navigator.webkitGetGamepads
          ? navigator.webkitGetGamepads
          : null;
        GLFW.lastGamepadStateFrame = Browser.mainLoop.currentFrameNumber;
        for (var joy = 0; joy < GLFW.lastGamepadState.length; ++joy) {
          var gamepad = GLFW.lastGamepadState[joy];
          if (gamepad) {
            if (!GLFW.joys[joy]) {
              console.log("glfw joystick connected:", joy);
              GLFW.joys[joy] = {
                id: allocate(
                  intArrayFromString(gamepad.id),
                  "i8",
                  ALLOC_NORMAL
                ),
                buttonsCount: gamepad.buttons.length,
                axesCount: gamepad.axes.length,
                buttons: allocate(
                  new Array(gamepad.buttons.length),
                  "i8",
                  ALLOC_NORMAL
                ),
                axes: allocate(
                  new Array(gamepad.axes.length * 4),
                  "float",
                  ALLOC_NORMAL
                ),
              };
              if (GLFW.joystickFunc) {
                Module["dynCall_vii"](GLFW.joystickFunc, joy, 262145);
              }
            }
            var data = GLFW.joys[joy];
            for (var i = 0; i < gamepad.buttons.length; ++i) {
              setValue(data.buttons + i, gamepad.buttons[i].pressed, "i8");
            }
            for (var i = 0; i < gamepad.axes.length; ++i) {
              setValue(data.axes + i * 4, gamepad.axes[i], "float");
            }
          } else {
            if (GLFW.joys[joy]) {
              console.log("glfw joystick disconnected", joy);
              if (GLFW.joystickFunc) {
                Module["dynCall_vii"](GLFW.joystickFunc, joy, 262146);
              }
              _free(GLFW.joys[joy].id);
              _free(GLFW.joys[joy].buttons);
              _free(GLFW.joys[joy].axes);
              delete GLFW.joys[joy];
            }
          }
        }
      }
    },
    setKeyCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.keyFunc = cbfun;
    },
    setCharCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.charFunc = cbfun;
    },
    setMouseButtonCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.mouseButtonFunc = cbfun;
    },
    setCursorPosCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.cursorPosFunc = cbfun;
    },
    setScrollCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.scrollFunc = cbfun;
    },
    setDropCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.dropFunc = cbfun;
    },
    onDrop: function (event) {
      if (!GLFW.active || !GLFW.active.dropFunc) return;
      if (
        !event.dataTransfer ||
        !event.dataTransfer.files ||
        event.dataTransfer.files.length == 0
      )
        return;
      event.preventDefault();
      var filenames = allocate(
        new Array(event.dataTransfer.files.length * 4),
        "i8*",
        ALLOC_NORMAL
      );
      var filenamesArray = [];
      var count = event.dataTransfer.files.length;
      var written = 0;
      var drop_dir = ".glfw_dropped_files";
      FS.createPath("/", drop_dir);
      function save(file) {
        var path = "/" + drop_dir + "/" + file.name.replace(/\//g, "_");
        var reader = new FileReader();
        reader.onloadend = function (e) {
          if (reader.readyState != 2) {
            ++written;
            console.log(
              "failed to read dropped file: " + file.name + ": " + reader.error
            );
            return;
          }
          var data = e.target.result;
          FS.writeFile(path, new Uint8Array(data));
          if (++written === count) {
            Module["dynCall_viii"](
              GLFW.active.dropFunc,
              GLFW.active.id,
              count,
              filenames
            );
            for (var i = 0; i < filenamesArray.length; ++i) {
              _free(filenamesArray[i]);
            }
            _free(filenames);
          }
        };
        reader.readAsArrayBuffer(file);
        var filename = allocate(intArrayFromString(path), "i8", ALLOC_NORMAL);
        filenamesArray.push(filename);
        setValue(filenames + i * 4, filename, "i8*");
      }
      for (var i = 0; i < count; ++i) {
        save(event.dataTransfer.files[i]);
      }
      return false;
    },
    onDragover: function (event) {
      if (!GLFW.active || !GLFW.active.dropFunc) return;
      event.preventDefault();
      return false;
    },
    setWindowSizeCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.windowSizeFunc = cbfun;
      if (!win.windowSizeFunc) return;
      Module["dynCall_vii"](win.windowSizeFunc, win.width, win.height);
    },
    setWindowCloseCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.windowCloseFunc = cbfun;
    },
    setWindowRefreshCallback: function (winid, cbfun) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.windowRefreshFunc = cbfun;
    },
    onClickRequestPointerLock: function (e) {
      if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
        Module["canvas"].requestPointerLock();
        e.preventDefault();
      }
    },
    setInputMode: function (winid, mode, value) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      switch (mode) {
        case 208897: {
          switch (value) {
            case 212993: {
              win.inputModes[mode] = value;
              Module["canvas"].removeEventListener(
                "click",
                GLFW.onClickRequestPointerLock,
                true
              );
              Module["canvas"].exitPointerLock();
              break;
            }
            case 212994: {
              console.log(
                "glfwSetInputMode called with GLFW_CURSOR_HIDDEN value not implemented."
              );
              break;
            }
            case 212995: {
              win.inputModes[mode] = value;
              Module["canvas"].addEventListener(
                "click",
                GLFW.onClickRequestPointerLock,
                true
              );
              Module["canvas"].requestPointerLock();
              break;
            }
            default: {
              console.log(
                "glfwSetInputMode called with unknown value parameter value: " +
                  value +
                  "."
              );
              break;
            }
          }
          break;
        }
        case 208898: {
          console.log(
            "glfwSetInputMode called with GLFW_STICKY_KEYS mode not implemented."
          );
          break;
        }
        case 208899: {
          console.log(
            "glfwSetInputMode called with GLFW_STICKY_MOUSE_BUTTONS mode not implemented."
          );
          break;
        }
        default: {
          console.log(
            "glfwSetInputMode called with unknown mode parameter value: " +
              mode +
              "."
          );
          break;
        }
      }
    },
    getKey: function (winid, key) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return 0;
      return win.keys[key];
    },
    getMouseButton: function (winid, button) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return 0;
      return (win.buttons & (1 << button)) > 0;
    },
    getCursorPos: function (winid, x, y) {
      setValue(x, Browser.mouseX, "double");
      setValue(y, Browser.mouseY, "double");
    },
    getMousePos: function (winid, x, y) {
      setValue(x, Browser.mouseX, "i32");
      setValue(y, Browser.mouseY, "i32");
    },
    setCursorPos: function (winid, x, y) {},
    getWindowPos: function (winid, x, y) {
      var wx = 0;
      var wy = 0;
      var win = GLFW.WindowFromId(winid);
      if (win) {
        wx = win.x;
        wy = win.y;
      }
      setValue(x, wx, "i32");
      setValue(y, wy, "i32");
    },
    setWindowPos: function (winid, x, y) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      win.x = x;
      win.y = y;
    },
    getWindowSize: function (winid, width, height) {
      var ww = 0;
      var wh = 0;
      var win = GLFW.WindowFromId(winid);
      if (win) {
        ww = win.width;
        wh = win.height;
      }
      setValue(width, ww, "i32");
      setValue(height, wh, "i32");
    },
    setWindowSize: function (winid, width, height) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      if (GLFW.active.id == win.id) {
        if (width == screen.width && height == screen.height) {
          GLFW.requestFullscreen();
        } else {
          GLFW.exitFullscreen();
          Browser.setCanvasSize(width, height);
          win.width = width;
          win.height = height;
        }
      }
      if (!win.windowSizeFunc) return;
      Module["dynCall_vii"](win.windowSizeFunc, width, height);
    },
    createWindow: function (width, height, title, monitor, share) {
      var i, id;
      for (i = 0; i < GLFW.windows.length && GLFW.windows[i] !== null; i++);
      if (i > 0)
        throw "glfwCreateWindow only supports one window at time currently";
      id = i + 1;
      if (width <= 0 || height <= 0) return 0;
      if (monitor) {
        GLFW.requestFullscreen();
      } else {
        Browser.setCanvasSize(width, height);
      }
      for (i = 0; i < GLFW.windows.length && GLFW.windows[i] == null; i++);
      if (i == GLFW.windows.length) {
        var contextAttributes = {
          antialias: GLFW.hints[135181] > 1,
          depth: GLFW.hints[135173] > 0,
          stencil: GLFW.hints[135174] > 0,
          alpha: GLFW.hints[135172] > 0,
        };
        Module.ctx = Browser.createContext(
          Module["canvas"],
          true,
          true,
          contextAttributes
        );
      }
      if (!Module.ctx) return 0;
      var win = new GLFW.Window(id, width, height, title, monitor, share);
      if (id - 1 == GLFW.windows.length) {
        GLFW.windows.push(win);
      } else {
        GLFW.windows[id - 1] = win;
      }
      GLFW.active = win;
      return win.id;
    },
    destroyWindow: function (winid) {
      var win = GLFW.WindowFromId(winid);
      if (!win) return;
      GLFW.windows[win.id - 1] = null;
      if (GLFW.active.id == win.id) GLFW.active = null;
      for (var i = 0; i < GLFW.windows.length; i++)
        if (GLFW.windows[i] !== null) return;
      Module.ctx = Browser.destroyContext(Module["canvas"], true, true);
    },
    swapBuffers: function (winid) {},
    GLFW2ParamToGLFW3Param: function (param) {
      var table = {
        196609: 0,
        196610: 0,
        196611: 0,
        196612: 0,
        196613: 0,
        196614: 0,
        131073: 0,
        131074: 0,
        131075: 0,
        131076: 0,
        131077: 135169,
        131078: 135170,
        131079: 135171,
        131080: 135172,
        131081: 135173,
        131082: 135174,
        131083: 135183,
        131084: 135175,
        131085: 135176,
        131086: 135177,
        131087: 135178,
        131088: 135179,
        131089: 135180,
        131090: 0,
        131091: 135181,
        131092: 139266,
        131093: 139267,
        131094: 139270,
        131095: 139271,
        131096: 139272,
      };
      return table[param];
    },
  };
  function _glfwGetKey(key) {
    return GLFW.getKey(GLFW.active.id, key);
  }
  function _glfwGetMouseButton(button) {
    return GLFW.getMouseButton(GLFW.active.id, button);
  }
  function _glfwGetMousePos(x, y) {
    GLFW.getMousePos(GLFW.active.id, x, y);
  }
  function _glfwGetWindowSize(width, height) {
    GLFW.getWindowSize(GLFW.active.id, width, height);
  }
  function _glfwInit() {
    if (GLFW.windows) return 1;
    GLFW.initialTime = GLFW.getTime();
    GLFW.hints = GLFW.defaultHints;
    GLFW.windows = new Array();
    GLFW.active = null;
    window.addEventListener("gamepadconnected", GLFW.onGamepadConnected, true);
    window.addEventListener(
      "gamepaddisconnected",
      GLFW.onGamepadDisconnected,
      true
    );
    window.addEventListener("keydown", GLFW.onKeydown, true);
    window.addEventListener("keypress", GLFW.onKeyPress, true);
    window.addEventListener("keyup", GLFW.onKeyup, true);
    window.addEventListener("blur", GLFW.onBlur, true);
    Module["canvas"].addEventListener("mousemove", GLFW.onMousemove, true);
    Module["canvas"].addEventListener(
      "mousedown",
      GLFW.onMouseButtonDown,
      true
    );
    Module["canvas"].addEventListener("mouseup", GLFW.onMouseButtonUp, true);
    Module["canvas"].addEventListener("wheel", GLFW.onMouseWheel, true);
    Module["canvas"].addEventListener("mousewheel", GLFW.onMouseWheel, true);
    Module["canvas"].addEventListener("mouseenter", GLFW.onMouseenter, true);
    Module["canvas"].addEventListener("mouseleave", GLFW.onMouseleave, true);
    Module["canvas"].addEventListener("drop", GLFW.onDrop, true);
    Module["canvas"].addEventListener("dragover", GLFW.onDragover, true);
    Browser.resizeListeners.push(function (width, height) {
      GLFW.onCanvasResize(width, height);
    });
    return 1;
  }
  function _glfwOpenWindow(
    width,
    height,
    redbits,
    greenbits,
    bluebits,
    alphabits,
    depthbits,
    stencilbits,
    mode
  ) {
    GLFW.hints[135169] = redbits;
    GLFW.hints[135170] = greenbits;
    GLFW.hints[135171] = bluebits;
    GLFW.hints[135172] = alphabits;
    GLFW.hints[135173] = depthbits;
    GLFW.hints[135174] = stencilbits;
    GLFW.createWindow(width, height, "GLFW2 Window", 0, 0);
    return 1;
  }
  function _glfwSwapBuffers() {
    GLFW.swapBuffers(GLFW.active.id);
  }
  function _glfwTerminate() {
    window.removeEventListener(
      "gamepadconnected",
      GLFW.onGamepadConnected,
      true
    );
    window.removeEventListener(
      "gamepaddisconnected",
      GLFW.onGamepadDisconnected,
      true
    );
    window.removeEventListener("keydown", GLFW.onKeydown, true);
    window.removeEventListener("keypress", GLFW.onKeyPress, true);
    window.removeEventListener("keyup", GLFW.onKeyup, true);
    window.removeEventListener("blur", GLFW.onBlur, true);
    Module["canvas"].removeEventListener("mousemove", GLFW.onMousemove, true);
    Module["canvas"].removeEventListener(
      "mousedown",
      GLFW.onMouseButtonDown,
      true
    );
    Module["canvas"].removeEventListener("mouseup", GLFW.onMouseButtonUp, true);
    Module["canvas"].removeEventListener("wheel", GLFW.onMouseWheel, true);
    Module["canvas"].removeEventListener("mousewheel", GLFW.onMouseWheel, true);
    Module["canvas"].removeEventListener("mouseenter", GLFW.onMouseenter, true);
    Module["canvas"].removeEventListener("mouseleave", GLFW.onMouseleave, true);
    Module["canvas"].removeEventListener("drop", GLFW.onDrop, true);
    Module["canvas"].removeEventListener("dragover", GLFW.onDragover, true);
    Module["canvas"].width = Module["canvas"].height = 1;
    GLFW.windows = null;
    GLFW.active = null;
  }
  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest;
  }
  function _parse_ents(data) {
    data = Pointer_stringify(data);
    var cam_placed = false;
    kvparse(data, function (ent) {
      if (!cam_placed && ent.classname.substr(0, 17) == "info_player_start") {
        var pos = ent.origin.split(" ").map(parseFloat);
        var yaw = parseFloat(ent.angles.split(" ")[1]);
        Module.setCam(pos[0], pos[1], pos[2] + 64, 0, yaw);
        cam_placed = true;
      } else if (ent.classname == "sky_camera") {
        var pos = ent.origin.split(" ").map(parseFloat);
        var scale = parseFloat(ent.scale);
        _setSkybox(pos[0], pos[1], pos[2], scale);
      } else if (ent.classname == "light_environment") {
        var color = ent._ambient.split(" ");
        _setAmbient(color[0] / 255, color[1] / 255, color[2] / 255);
        var color = ent._light.split(" ");
        _setLight(color[0] / 255, color[1] / 255, color[2] / 255);
        var yaw = ent.angles.split(" ")[1];
        _setLightAngle(ent.pitch, yaw);
      } else if (ent.classname == "worldspawn") {
        var color = sky_colors[ent.skyname];
        if (color == null) {
          color = 3842303;
        }
        var r = color >> 16;
        var g = (color >> 8) & 255;
        var b = color & 255;
        _setSkyColor(r / 255, g / 255, b / 255);
      } else if (ent.model != null && ent.model[0] == "*") {
        var model_id = parseInt(ent.model.substr(1));
        var pos;
        if (ent.origin != null) pos = ent.origin.split(" ").map(parseFloat);
        else pos = [0, 0, 0];
        _setModel(model_id, pos[0], pos[1], pos[2]);
      }
    });
  }
  function _pick_color(name, x) {
    name = Pointer_stringify(name).toLowerCase();
    var match = name.match(/maps\/[^/]*\/(.*)_.*_.*_.*/);
    if (match != null) {
      name = match[1];
    }
    if (name == "tools/toolstrigger") return -1;
    var color = color_table[name];
    if (color != null) {
      if (Array.isArray(color)) {
        var r0 = color[0] >> 16;
        var g0 = (color[0] >> 8) & 255;
        var b0 = color[0] & 255;
        var r1 = color[1] >> 16;
        var g1 = (color[1] >> 8) & 255;
        var b1 = color[1] & 255;
        r0 = Math.floor(r0 + (r1 - r0) * x);
        g0 = Math.floor(g0 + (g1 - g0) * x);
        b0 = Math.floor(b0 + (b1 - b0) * x);
        color = (r0 << 16) | (g0 << 8) | b0;
      }
      return color;
    }
    return guess_color(name);
  }
  function ___setErrNo(value) {
    if (Module["___errno_location"])
      HEAP32[Module["___errno_location"]() >> 2] = value;
    return value;
  }
  Module["requestFullScreen"] = function Module_requestFullScreen(
    lockPointer,
    resizeCanvas,
    vrDevice
  ) {
    Module.printErr(
      "Module.requestFullScreen is deprecated. Please call Module.requestFullscreen instead."
    );
    Module["requestFullScreen"] = Module["requestFullscreen"];
    Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice);
  };
  Module["requestFullscreen"] = function Module_requestFullscreen(
    lockPointer,
    resizeCanvas,
    vrDevice
  ) {
    Browser.requestFullscreen(lockPointer, resizeCanvas, vrDevice);
  };
  Module["requestAnimationFrame"] = function Module_requestAnimationFrame(
    func
  ) {
    Browser.requestAnimationFrame(func);
  };
  Module["setCanvasSize"] = function Module_setCanvasSize(
    width,
    height,
    noUpdates
  ) {
    Browser.setCanvasSize(width, height, noUpdates);
  };
  Module["pauseMainLoop"] = function Module_pauseMainLoop() {
    Browser.mainLoop.pause();
  };
  Module["resumeMainLoop"] = function Module_resumeMainLoop() {
    Browser.mainLoop.resume();
  };
  Module["getUserMedia"] = function Module_getUserMedia() {
    Browser.getUserMedia();
  };
  Module["createContext"] = function Module_createContext(
    canvas,
    useWebGL,
    setInModule,
    webGLContextAttributes
  ) {
    return Browser.createContext(
      canvas,
      useWebGL,
      setInModule,
      webGLContextAttributes
    );
  };
  if (ENVIRONMENT_IS_NODE) {
    _emscripten_get_now = function _emscripten_get_now_actual() {
      var t = process["hrtime"]();
      return t[0] * 1e3 + t[1] / 1e6;
    };
  } else if (typeof dateNow !== "undefined") {
    _emscripten_get_now = dateNow;
  } else if (
    typeof self === "object" &&
    self["performance"] &&
    typeof self["performance"]["now"] === "function"
  ) {
    _emscripten_get_now = function () {
      return self["performance"]["now"]();
    };
  } else if (
    typeof performance === "object" &&
    typeof performance["now"] === "function"
  ) {
    _emscripten_get_now = function () {
      return performance["now"]();
    };
  } else {
    _emscripten_get_now = Date.now;
  }
  var GLctx;
  GL.init();
  DYNAMICTOP_PTR = staticAlloc(4);
  STACK_BASE = STACKTOP = alignMemory(STATICTOP);
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = alignMemory(STACK_MAX);
  HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
  staticSealed = true;
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(
      stringy,
      u8array,
      0,
      u8array.length
    );
    if (dontAddNull) u8array.length = numBytesWritten;
    return u8array;
  }
  Module["wasmTableSize"] = 42;
  Module["wasmMaxTableSize"] = 42;
  Module.asmGlobalArg = {};
  Module.asmLibraryArg = {
    abort: abort,
    enlargeMemory: enlargeMemory,
    getTotalMemory: getTotalMemory,
    abortOnCannotGrowMemory: abortOnCannotGrowMemory,
    ___assert_fail: ___assert_fail,
    ___cxa_allocate_exception: ___cxa_allocate_exception,
    ___cxa_throw: ___cxa_throw,
    ___setErrNo: ___setErrNo,
    ___syscall140: ___syscall140,
    ___syscall146: ___syscall146,
    ___syscall54: ___syscall54,
    ___syscall6: ___syscall6,
    _abort: _abort,
    _emscripten_memcpy_big: _emscripten_memcpy_big,
    _emscripten_set_main_loop: _emscripten_set_main_loop,
    _glAttachShader: _glAttachShader,
    _glBindBuffer: _glBindBuffer,
    _glBlendFunc: _glBlendFunc,
    _glBufferData: _glBufferData,
    _glClear: _glClear,
    _glClearColor: _glClearColor,
    _glColorMask: _glColorMask,
    _glCompileShader: _glCompileShader,
    _glCreateProgram: _glCreateProgram,
    _glCreateShader: _glCreateShader,
    _glDisable: _glDisable,
    _glDrawArrays: _glDrawArrays,
    _glEnable: _glEnable,
    _glEnableVertexAttribArray: _glEnableVertexAttribArray,
    _glFrontFace: _glFrontFace,
    _glGenBuffers: _glGenBuffers,
    _glGetUniformLocation: _glGetUniformLocation,
    _glLinkProgram: _glLinkProgram,
    _glShaderSource: _glShaderSource,
    _glStencilFunc: _glStencilFunc,
    _glStencilOp: _glStencilOp,
    _glUniform3f: _glUniform3f,
    _glUniform4f: _glUniform4f,
    _glUniformMatrix4fv: _glUniformMatrix4fv,
    _glUseProgram: _glUseProgram,
    _glVertexAttribPointer: _glVertexAttribPointer,
    _glViewport: _glViewport,
    _glfwGetKey: _glfwGetKey,
    _glfwGetMouseButton: _glfwGetMouseButton,
    _glfwGetMousePos: _glfwGetMousePos,
    _glfwGetWindowSize: _glfwGetWindowSize,
    _glfwInit: _glfwInit,
    _glfwOpenWindow: _glfwOpenWindow,
    _glfwSwapBuffers: _glfwSwapBuffers,
    _glfwTerminate: _glfwTerminate,
    _parse_ents: _parse_ents,
    _pick_color: _pick_color,
    DYNAMICTOP_PTR: DYNAMICTOP_PTR,
    STACKTOP: STACKTOP,
  };
  var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  Module["asm"] = asm;
  var ___errno_location = (Module["___errno_location"] = function () {
    return Module["asm"]["___errno_location"].apply(null, arguments);
  });
  var _emscripten_replace_memory = (Module["_emscripten_replace_memory"] =
    function () {
      return Module["asm"]["_emscripten_replace_memory"].apply(null, arguments);
    });
  var _free = (Module["_free"] = function () {
    return Module["asm"]["_free"].apply(null, arguments);
  });
  var _initRenderer = (Module["_initRenderer"] = function () {
    return Module["asm"]["_initRenderer"].apply(null, arguments);
  });
  var _loadMap = (Module["_loadMap"] = function () {
    return Module["asm"]["_loadMap"].apply(null, arguments);
  });
  var _malloc = (Module["_malloc"] = function () {
    return Module["asm"]["_malloc"].apply(null, arguments);
  });
  var _setAmbient = (Module["_setAmbient"] = function () {
    return Module["asm"]["_setAmbient"].apply(null, arguments);
  });
  var _setCam = (Module["_setCam"] = function () {
    return Module["asm"]["_setCam"].apply(null, arguments);
  });
  var _setLight = (Module["_setLight"] = function () {
    return Module["asm"]["_setLight"].apply(null, arguments);
  });
  var _setLightAngle = (Module["_setLightAngle"] = function () {
    return Module["asm"]["_setLightAngle"].apply(null, arguments);
  });
  var _setModel = (Module["_setModel"] = function () {
    return Module["asm"]["_setModel"].apply(null, arguments);
  });
  var _setSkyColor = (Module["_setSkyColor"] = function () {
    return Module["asm"]["_setSkyColor"].apply(null, arguments);
  });
  var _setSkybox = (Module["_setSkybox"] = function () {
    return Module["asm"]["_setSkybox"].apply(null, arguments);
  });
  var stackAlloc = (Module["stackAlloc"] = function () {
    return Module["asm"]["stackAlloc"].apply(null, arguments);
  });
  var stackRestore = (Module["stackRestore"] = function () {
    return Module["asm"]["stackRestore"].apply(null, arguments);
  });
  var stackSave = (Module["stackSave"] = function () {
    return Module["asm"]["stackSave"].apply(null, arguments);
  });
  var dynCall_v = (Module["dynCall_v"] = function () {
    return Module["asm"]["dynCall_v"].apply(null, arguments);
  });
  var dynCall_vi = (Module["dynCall_vi"] = function () {
    return Module["asm"]["dynCall_vi"].apply(null, arguments);
  });
  Module["asm"] = asm;
  Module["cwrap"] = cwrap;
  Module["then"] = function (func) {
    if (Module["calledRun"]) {
      func(Module);
    } else {
      var old = Module["onRuntimeInitialized"];
      Module["onRuntimeInitialized"] = function () {
        if (old) old();
        func(Module);
      };
    }
    return Module;
  };
  function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status;
  }
  ExitStatus.prototype = new Error();
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"]) run();
    if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
  };
  function run(args) {
    args = args || Module["arguments"];
    if (runDependencies > 0) {
      return;
    }
    preRun();
    if (runDependencies > 0) return;
    if (Module["calledRun"]) return;
    function doRun() {
      if (Module["calledRun"]) return;
      Module["calledRun"] = true;
      if (ABORT) return;
      ensureInitRuntime();
      preMain();
      if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
      postRun();
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(function () {
        setTimeout(function () {
          Module["setStatus"]("");
        }, 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  Module["run"] = run;
  function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"] && status === 0) {
      return;
    }
    if (Module["noExitRuntime"]) {
    } else {
      ABORT = true;
      EXITSTATUS = status;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module["onExit"]) Module["onExit"](status);
    }
    if (ENVIRONMENT_IS_NODE) {
      process["exit"](status);
    }
    Module["quit"](status, new ExitStatus(status));
  }
  Module["exit"] = exit;
  function abort(what) {
    if (Module["onAbort"]) {
      Module["onAbort"](what);
    }
    if (what !== undefined) {
      Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what);
    } else {
      what = "";
    }
    ABORT = true;
    EXITSTATUS = 1;
    throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
  }
  Module["abort"] = abort;
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")
      Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
      Module["preInit"].pop()();
    }
  }
  Module["noExitRuntime"] = true;
  run();
  var color_table = {};
  Module.ready = function (f) {
    var module = this;
    var color_req = new XMLHttpRequest();
    color_req.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status != 200) {
          console.log(
            "[vbsp.js] Warning! Failed to download color table! Only simple color guessing will be used."
          );
        } else {
          color_table = JSON.parse(this.response);
        }
        if (module.calledRun) {
          f();
        } else {
          module.onRuntimeInitialized = f;
        }
      }
    };
    color_req.open("GET", "colors.json", true);
    color_req.send();
  };
  var _loadMap = Module.cwrap("loadMap", null, ["number", "number"]);
  var map_request;
  Module.setCam = Module.cwrap("setCam", null, [
    "number",
    "number",
    "number",
    "number",
    "number",
  ]);
  var _setSkybox = Module.cwrap("setSkybox", null, [
    "number",
    "number",
    "number",
    "number",
  ]);
  var _setModel = Module.cwrap("setModel", null, [
    "number",
    "number",
    "number",
    "number",
  ]);
  var _setSkyColor = Module.cwrap("setSkyColor", null, [
    "number",
    "number",
    "number",
  ]);
  var _setAmbient = Module.cwrap("setAmbient", null, [
    "number",
    "number",
    "number",
  ]);
  var _setLight = Module.cwrap("setLight", null, [
    "number",
    "number",
    "number",
  ]);
  var _setLightAngle = Module.cwrap("setLightAngle", null, [
    "number",
    "number",
  ]);
  var load_div;
  function setLoadPercent(x, text, color) {
    var w = Module.canvas.width;
    var h = Module.canvas.height;
    load_div.style.width = w * x;
    load_div.style.height = h / 10;
    load_div.style.fontSize = h / 10 + "px";
    load_div.textContent = text;
    load_div.style.backgroundColor = color;
  }
  Module.loadMap = function (url) {
    console.log('[vbsp.js] Downloading "' + url + '"...');
    if (map_request) {
      map_request.onreadystatechange = null;
      map_request.abort();
    }
    map_request = new XMLHttpRequest();
    map_request.responseType = "arraybuffer";
    map_request.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status != 200) {
          console.log("[vbsp.js] Fatal! Failed to download map!");
          map_request = null;
          setLoadPercent(1, "Download failed!", "red");
          return;
        }
        setLoadPercent(1, "Initializing...", "orange");
        setTimeout(function () {
          var map_data = map_request.response;
          var map_size = map_data.byteLength;
          var map_ptr = Module._malloc(map_size);
          new Uint8Array(Module.buffer, map_ptr, map_size).set(
            new Uint8Array(map_data)
          );
          console.group('[vbsp.js] Initializing "' + url + '"...');
          console.time("Completed in");
          _loadMap(map_ptr, map_size);
          console.timeEnd("Completed in");
          console.groupEnd();
          Module._free(map_ptr);
          map_request = null;
          setLoadPercent(0);
        });
      }
    };
    map_request.addEventListener("progress", function (e) {
      if (e.lengthComputable) {
        var percent = e.loaded / e.total;
        if (percent != 1) setLoadPercent(percent, "Downloading...", "yellow");
      }
    });
    map_request.open("GET", url, true);
    map_request.send();
  };
  var _initRenderer = Module.cwrap("initRenderer", null, ["number", "number"]);
  Module.initRenderer = function (div) {
    div.style.position = "relative";
    Module.canvas = document.createElement("canvas");
    div.appendChild(Module.canvas);
    Module.canvas.style.cursor = "move";
    load_div = document.createElement("div");
    div.appendChild(load_div);
    load_div.style.position = "absolute";
    load_div.style.bottom = 0;
    console.log("[vbsp.js] Starting renderer.");
    _initRenderer(div.offsetWidth, div.offsetHeight);
    setLoadPercent(1, "Ready!", "lime");
  };
  function guess_color(name) {
    if (name.indexOf("gravel") > -1) return 5788488;
    if (name.indexOf("black") > -1) return 0;
    return 16777215;
  }
  function kvparse(data, callback) {
    var i = 0;
    var s = 0;
    var j = 0;
    var o = {};
    var k = "";
    var v = "";
    while (i < data.length) {
      if (s == 0) {
        if (data[i] == "{") {
          s = 1;
        }
      } else if (s == 1) {
        if (data[i] == '"') {
          s = 2;
          j = i + 1;
        } else if (data[i] == "}") {
          s = 0;
          callback(o);
          o = {};
        }
      } else if (s == 2) {
        if (data[i] == '"') {
          s = 3;
          k += data.substring(j, i);
        } else if (data[i] == "\\") {
          throw "FUCK MY ASS HOLE";
        }
      } else if (s == 3) {
        if (data[i] == '"') {
          s = 4;
          j = i + 1;
        }
      } else if (s == 4) {
        if (data[i] == '"') {
          s = 1;
          v += data.substring(j, i);
          o[k] = v;
          k = "";
          v = "";
        } else if (data[i] == "\\") {
          throw "FUCK MY ASS HOLE";
        }
      }
      i++;
    }
  }
  var sky_colors = {
    sky_borealis01: 1322556,
    sky_day01_01: 9145740,
    sky_day01_04: 11120046,
    sky_day01_05: 10856607,
    sky_day01_06: 9997432,
    sky_day01_07: 8876133,
    sky_day01_08: 6573129,
    sky_day01_09: 2636362,
    sky_day02_01: 9412276,
    sky_day02_02: 11451078,
    sky_day02_03: 11714502,
    sky_day02_04: 12240330,
    sky_day02_05: 12898774,
    sky_day02_06: 10728378,
    sky_day02_07: 8163225,
    sky_day02_09: 4280673,
    sky_day02_10: 12898774,
    sky_day03_01: 6318702,
    sky_day03_02: 6515563,
    sky_day03_03: 6186599,
    sky_day03_04: 7305079,
    sky_day03_05: 7765117,
    sky_day03_06: 5983819,
    sky_wasteland02: 7836054,
    assault: 7835538,
    cx: 11057600,
    de_cobble: 9211533,
    de_cobble_hdr: 9211533,
    de_piranesi: 9211533,
    hav: 5460325,
    italy: 9408149,
    jungle: 6451570,
    militia_hdr: 8827859,
    office: 8949910,
    sky_dust: 13165556,
    tides: 9346471,
    train: 11909560,
    sky_dod_01_hdr: 7442335,
    sky_dod_02_hdr: 5927804,
    sky_dod_03_hdr: 7573662,
    sky_dod_04_hdr: 5731455,
    sky_dod_06_hdr: 10328989,
    sky_dod_08_hdr: 9017253,
    sky_dod_09_hdr: 1844270,
    sky_dod_10_hdr: 6319475,
    sky_lostcoast_hdr: 8295849,
    alien1: 2961702,
    black: 65537,
    desert: 7509191,
    neb6: 4075559,
    neb7: 3290930,
    night: 987182,
    sky_dawn01: 4143669,
    xen9: 2569241,
    sky_dock_01: 10517341,
    sky_dock_02: 7177350,
    sky_finale: 4997187,
    sky_highrise: 6178889,
    sky_pit: 9139046,
    sky_u4: 7177350,
    sky_ep01_00: 5326646,
    sky_ep01_01: 7831423,
    sky_ep01_02: 11573365,
    sky_ep01_04a: 9268819,
    sky_ep01_04: 9137489,
    sky_ep01_citadel_int: 8670742,
    sky_fog_002: 7701397,
    sky_ep02_01_hdr: 5333354,
    sky_ep02_02_hdr: 7900059,
    sky_ep02_03_hdr: 7440537,
    sky_ep02_04_hdr: 6780293,
    sky_ep02_05_hdr: 5792108,
    sky_ep02_06_hdr: 5264221,
    sky_ep02_caves_hdr: 11783146,
    sky_tf2_04: 6920125,
    sky_upward: 6258588,
    sky_dustbowl_01: 9027555,
    sky_goldrush_01: 10199712,
    sky_granary_01: 13421504,
    sky_well_01: 6118536,
    sky_gravel_01: 7234923,
    sky_badlands_01: 7102834,
    sky_hydro_01: 11120585,
    sky_night_01: 3420479,
    sky_nightfall_01: 1184279,
    sky_trainyard_01: 10401232,
    sky_stormfront_01: 11778775,
    sky_morningsnow_01: 11644617,
    sky_alpinestorm_01: 4014667,
    sky_harvest_01: 12689261,
    sky_harvest_night_01: 4399418,
    sky_halloween: 1907240,
    sky_halloween_night_01: 2500142,
    sky_halloween_night2014_01: 2565423,
    sky_jungle_01: 8821923,
    sky_invasion2fort_01: 1250841,
    sky_well_02: 6118536,
    sky_outpost_01: 4608096,
    sky_island_01: 5067357,
    sky_coastal_01: 9087178,
    sky_rainbow_01: 7841201,
    sky_badlands_pyroland_01: 12888238,
    sky_pyroland_01: 6870493,
    sky_pyroland_02: 7320507,
    sky_pyroland_03: 5609123,
    sky_l4d_urban01_hdr: 3890540,
    test_moon_hdr: 3890540,
    sky_day01_09_hdr: 2507096,
    urbannightburning_hdr: 4273716,
    sky_l4d_rural02_hdr: 2633534,
    river_hdr: 6253172,
    docks_hdrhighrise_hdr: 4276805,
    sky_l4d_c1_1_hdr: 8688023,
    sky_l4d_c1_2_hdr: 5005158,
    sky_l4d_c2m1_hdr: 4150365,
    sky_l4d_night02_hdr: 3949131,
    sky_l4d_predawn02_hdr: 11645614,
    sky_l4d_c4m1_hdr: 6186349,
    sky_l4d_c4m4_hdr: 3159610,
    sky_l4d_c5_1_hdr: 9343131,
    sky_l4d_c6m1_hdr: 5854043,
    sky_black: 0,
    sky_black_nofog: 65537,
    sky_white: 11783146,
    sky_fog: 4609125,
    cs_baggage_skybox_: 7632512,
    cs_tibet: 7699839,
    embassy: 10066844,
    sky_cs15_daylight01_hdr: 13430268,
    sky_cs15_daylight02_hdr: 15200741,
    nukeblank: 5998266,
    sky_venice: 7778011,
    sky_cs15_daylight03_hdr: 13362941,
    sky_cs15_daylight04_hdr: 14019578,
    sky_csgo_cloudy01: 3422021,
    sky_csgo_night02: 3619929,
    sky_csgo_night02b: 2566979,
    vertigo: 7895933,
    vertigoblue_hdr: 12375019,
    sky_dust: 11324122,
    vietnam: 7371908,
    bm_sky_underground_00: 65537,
    inboundsky: 11512995,
    sky_dm_bounce_: 4603963,
    "sky_dm_gasworks_ (has its correct appearance in HDR mode only)": 1973795,
    sky_dm_stalkyard_: 2500136,
    sky_dusk_01: 5460305,
    sky_faf_dusk_01: 7824184,
    sky_oar_night_01: 1645354,
    sky_st_day_01: 6790084,
    sky_st_day_03: 7432282,
    sky_st_dusk_01: 6903364,
    sky_flashback_a: 6453651,
    sky_fpp: 8036029,
    sky_fpp_hdr: 8036029,
    sky_l00_hdr: 0,
    sky_l02_a: 5264220,
    sky_l02_a_hdr: 5264220,
    sky_l02_day: 6450289,
    sky_l02_day_hdr: 6450289,
    sky_l02_night: 854802,
    sky_l02_night_hdr: 854802,
    sky_l03_hdr: 1908003,
    sky_l05: 5136512,
    sky_l05_hdr: 5136512,
    sky_l06: 10461087,
    sky_l06_hdr: 16777215,
    sky_l08_hdr: 0,
    sky_l09_hdr: 9080725,
    sky_l10: 526344,
    sky_l10_hdr: 526344,
    sky_l11: 5784897,
    sky_l11_hdr: 5784897,
    sky_l1_karthal: 5399927,
    sky_l1_karthal_hdr: 5399927,
    sky_l4: 8289915,
    sky_l4_hdr: 8289915,
    sky_l7: 6385284,
    sky_l7_hdr: 6385284,
    sky_null: 16777215,
    sky_template_: 6183748,
    sky_buhriz_: 9675953,
    "!_market_": 4411201,
    "!_ramadinight_": 789004,
    af_range_sunset_: 10202007,
    af_sky_mountains_: 7173237,
    ins_mino: 9144956,
    mino_sky01: 11316902,
    nightsky_lfw_: 854796,
    ramadisky: 9347505,
    sibenik_sql_: 8228761,
    sky_ascari01: 10858664,
    doi_sky01: 5656389,
    doi_sky02: 7712173,
    doi_sky03: 5919050,
    doi_sky04: 4872277,
    doi_sky05: 7039080,
    doi_sky06: 6053730,
    doi_sky07: 9212824,
    doi_sky08: 9138259,
    doi_sunset01: 12099992,
    sky_hurtgen_: 6975852,
    sky_sandstorm01: 15517065,
    "blacksky (No HDR)": 0,
    sky_c2_m1: 8686734,
    sky_c2_m2: 9344926,
    sky_c3_m2: 5990521,
    sky_c4_m1: 4613517,
    sky_c5_m1: 6715541,
    sky_c6_m1: 7896959,
    sky_c7_m2: 2368304,
    sky_c7_m3: 921115,
    sky_c9_m1: 1185566,
    "sky_borealissurge01 (HDR Only)": 13952754,
    "2desert": 12756393,
    alien2: 6978931,
    alien3: 6256245,
    city: 5457719,
    cliff: 6982582,
    dusk: 7493983,
    morning: 9216440,
    neb1: 3482906,
    neb2b: 2957857,
    space: 65792,
    xen8: 1839696,
    xen10: 336669,
  };

  return VBSP;
};
if (typeof exports === "object" && typeof module === "object")
  module.exports = VBSP;
else if (typeof define === "function" && define["amd"])
  define([], function () {
    return VBSP;
  });
else if (typeof exports === "object") exports["VBSP"] = VBSP;
