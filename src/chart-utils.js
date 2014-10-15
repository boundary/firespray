define(['underscore'],

    function (_) {

        var exports = {};
        exports.override = function (_objA, _objB) { for (var x in _objA) {if (x in _objB) {_objB[x] = _objA[x];}} };
        exports.cloneJSON = function(_obj){ return JSON.parse(JSON.stringify(_obj)); };
        exports.deepExtend = function extend(destination, source) {
            for (var property in source) {
                if (source[property] && source[property].constructor &&
                    source[property].constructor === Object) {
                    destination[property] = destination[property] || {};
                    extend(destination[property], source[property]);
                } else {
                    destination[property] = source[property];
                }
            }
            return destination;
        };
        //DOMParser shim for Safari
        (function(DOMParser) {
            "use strict";
            var DOMParser_proto = DOMParser.prototype,
                real_parseFromString = DOMParser_proto.parseFromString;
            try {
                if ((new DOMParser()).parseFromString("", "text/html")) {
                    return;
                }
            } catch (ex) {}

            DOMParser_proto.parseFromString = function(markup, type) {
                if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
                    var doc = document.implementation.createHTMLDocument("");
                    if (markup.toLowerCase().indexOf('<!doctype') > -1) {
                        doc.documentElement.innerHTML = markup;
                    }
                    else {
                        doc.body.innerHTML = markup;
                    }
                    return doc;
                } else {
                    return real_parseFromString.apply(this, arguments);
                }
            };
        }(DOMParser));
        exports.throttle = _.throttle;
        exports.generateUID = function(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c==='x'?r:r&0x3|0x8;return v.toString(16);}); };

        return exports;

    });