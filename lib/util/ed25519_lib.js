"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
//  This module provides the signing functionality used by the stellar network
//  The code below may look a little strange... this is because we try to provide
//  the most efficient signing method possible.  First, we try to load the
//  native ed25519 package for node.js environments, and if that fails we
//  fallback to tweetnacl.js

var actualMethods = {};
//
// // if in node
if (typeof window === "undefined") {
    (function () {
        // NOTE: we use commonjs style require here because es6 imports
        // can only occur at the top level.  thanks, obama.
        var ed25519 = require("ed25519");

        actualMethods.getPublic = function (privateKey) {

            return ed25519.MakeKeypairFromPrivate(privateKey).publicKey;
        };

        actualMethods.signHDK = function (data, secretKey) {
            data = new Buffer(data);
            return ed25519.SignByHDK(data, secretKey);
        };

        actualMethods.numberAdd = function (privateKey, tweak) {

            return ed25519.PrivateKeyAdd(privateKey, tweak);
        };

        actualMethods.publicKeyAdd = function (publicKey, tweak) {

            return ed25519.PublicKeyAdd(publicKey, tweak);
        };

        actualMethods.safeModL = function (value) {

            return ed25519.SafeModL(value);
        };
    })();
} else {
    (function () {
        // fallback to tweetnacl.js if we're in the browser

        var nacl = require("./nacl_util");

        actualMethods.getPublic = function (privateKey) {

            return nacl.util.getPublic(privateKey).publicKey;
        };

        actualMethods.signHDK = function (data, secretKey) {

            return nacl.sign.hdk(data, secretKey);
        };

        actualMethods.numberAdd = function (privateKey, tweak) {

            return nacl.util.numberAdd(privateKey, tweak);
        };

        actualMethods.publicKeyAdd = function (publicKey, tweak) {

            return nacl.util.publicKeyAdd(publicKey, tweak);
        };

        actualMethods.safeModL = function (value) {
            if (nacl.util.compareWithSafeKeyMask(value) === 1) return new Buffer(nacl.util.modN(value));
            return new Buffer(value);
        };
    })();
}

var ed25519Lib = actualMethods;
exports.ed25519Lib = ed25519Lib;