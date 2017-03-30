"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var xdr = _interopRequire(require("./generated/stellar-xdr_generated"));

var Keypair = require("./keypair").Keypair;

var _jsXdr = require("js-xdr");

var UnsignedHyper = _jsXdr.UnsignedHyper;
var Hyper = _jsXdr.Hyper;

var hash = require("./hashing").hash;

var encodeCheck = require("./strkey").encodeCheck;

var Asset = require("./asset").Asset;

var BigNumber = _interopRequire(require("bignumber.js"));

var best_r = require("./util/continued_fraction").best_r;

var padEnd = _interopRequire(require("lodash/padEnd"));

var trimEnd = _interopRequire(require("lodash/trimEnd"));

var isEmpty = _interopRequire(require("lodash/isEmpty"));

var isUndefined = _interopRequire(require("lodash/isUndefined"));

var isString = _interopRequire(require("lodash/isString"));

var isBoolean = _interopRequire(require("lodash/isBoolean"));

var isNumber = _interopRequire(require("lodash/isNumber"));

var isFinite = _interopRequire(require("lodash/isFinite"));

var ADMIN_OP_COMMISSION = "commission";
exports.ADMIN_OP_COMMISSION = ADMIN_OP_COMMISSION;
var ADMIN_OP_TRAITS = "traits";
exports.ADMIN_OP_TRAITS = ADMIN_OP_TRAITS;
var ADMIN_OP_ACCOUNT_LIMITS = "account_limits";
exports.ADMIN_OP_ACCOUNT_LIMITS = ADMIN_OP_ACCOUNT_LIMITS;
var ADMIN_OP_ASSET = "asset";
exports.ADMIN_OP_ASSET = ADMIN_OP_ASSET;
var ADMIN_OP_MAX_REVERSAL_DURATION = "max_reversal_duration";

exports.ADMIN_OP_MAX_REVERSAL_DURATION = ADMIN_OP_MAX_REVERSAL_DURATION;
var ONE = 10000000;
var MAX_INT64 = "9223372036854775807";

/**
 * `Operation` class represents [operations](https://www.stellar.org/developers/learn/concepts/operations.html) in Stellar network.
 * Use one of static methods to create operations:
 * * `{@link Operation.createAccount}`
 * * `{@link Operation.payment}`
 * * `{@link Operation.pathPayment}`
 * * `{@link Operation.manageOffer}`
 * * `{@link Operation.createPassiveOffer}`
 * * `{@link Operation.setOptions}`
 * * `{@link Operation.changeTrust}`
 * * `{@link Operation.allowTrust}`
 * * `{@link Operation.accountMerge}`
 * * `{@link Operation.inflation}`
 * * `{@link Operation.manageData}`
 *
 * @class Operation
 */

var Operation = exports.Operation = (function () {
    function Operation() {
        _classCallCheck(this, Operation);
    }

    _createClass(Operation, null, {
        createAccount: {

            /**
            * Create and fund a non existent account.
            * @param {object} opts
            * @param {string} opts.destination - Destination account ID to create an account for.
            * @param {string} opts.startingBalance - Amount in XLM the account should be funded for. Must be greater
            *                                   than the [reserve balance amount](https://www.stellar.org/developers/learn/concepts/fees.html).
            * @param {string} [opts.source] - The source account for the payment. Defaults to the transaction's source account.
            * @returns {xdr.CreateAccountOp}
            */

            value: function createAccount(opts) {
                if (!Keypair.isValidPublicKey(opts.destination)) {
                    throw new Error("destination is invalid");
                }

                if (isUndefined(opts.accountType) || !this._isValidAccountType(opts.accountType)) {
                    throw new Error("Must provide an accountType for a create user operation");
                }

                var attributes = {};
                attributes.destination = Keypair.fromAccountId(opts.destination).xdrAccountId();

                if (!isUndefined(opts.asset) && this.isValidAmount(opts.amount)) {
                    var scratchCard = new xdr.ScratchCard({
                        asset: opts.asset.toXdrObject(),
                        amount: this._toXDRAmount(opts.amount) });
                    attributes.body = new xdr.CreateAccountOpBody(this._accountTypeFromNumber(opts.accountType), scratchCard);
                } else {
                    attributes.body = new xdr.CreateAccountOpBody(this._accountTypeFromNumber(opts.accountType));
                }

                var createAccount = new xdr.CreateAccountOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.createAccount(createAccount);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        payment: {

            /**
            * Create a payment operation.
            * @param {object} opts
            * @param {string} opts.destination - The destination account ID.
            * @param {Asset} opts.asset - The asset to send.
            * @param {string} opts.amount - The amount to send.
            * @param {string} [opts.source] - The source account for the payment. Defaults to the transaction's source account.
            * @returns {xdr.PaymentOp}
            */

            value: function payment(opts) {
                if (!Keypair.isValidPublicKey(opts.destination)) {
                    throw new Error("destination is invalid");
                }
                if (!opts.asset) {
                    throw new Error("Must provide an asset for a payment operation");
                }
                if (!this.isValidAmount(opts.amount)) {
                    throw new TypeError("amount argument must be of type String and represent a positive number");
                }

                var attributes = {};
                attributes.destination = Keypair.fromAccountId(opts.destination).xdrAccountId();
                attributes.asset = opts.asset.toXdrObject();
                attributes.amount = this._toXDRAmount(opts.amount);
                var payment = new xdr.PaymentOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.payment(payment);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        externalPayment: {

            /**
             * Create a external payment operation.
             * @param {object} opts
             * @param {string} opts.exchangeAgent - The exchangeAgent account ID.
             * @param {string} opts.destinationBank - Destination bank account ID.
             * @param {string} opts.destinationAccount - Destination account ID.
             * @param {Asset} opts.asset - The asset to send.
             * @param {string} opts.amount - The amount to send.
             * @param {string} [opts.source] - The source account for the payment. Defaults to the transaction's source account.
             * @returns {xdr.PaymentOp}
             */

            value: function externalPayment(opts) {
                if (!Keypair.isValidPublicKey(opts.exchangeAgent)) {
                    throw new Error("exchangeAgent is invalid");
                }
                if (!Keypair.isValidPublicKey(opts.destinationBank)) {
                    throw new Error("destination bank is invalid");
                }
                if (!Keypair.isValidPublicKey(opts.destinationAccount)) {
                    throw new Error("destination account is invalid");
                }
                if (!opts.asset) {
                    throw new Error("Must provide an asset for a payment operation");
                }
                if (!this.isValidAmount(opts.amount)) {
                    throw new TypeError("amount argument must be of type String and represent a positive number");
                }

                var op = new xdr.ExternalPaymentOp({
                    exchangeAgent: Keypair.fromAccountId(opts.exchangeAgent).xdrAccountId(),
                    destinationBank: Keypair.fromAccountId(opts.destinationBank).xdrAccountId(),
                    destinationAccount: Keypair.fromAccountId(opts.destinationAccount).xdrAccountId(),
                    asset: opts.asset.toXdrObject(),
                    amount: this._toXDRAmount(opts.amount) });

                var opAttributes = {
                    body: xdr.OperationBody.externalPayment(op)
                };

                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        pathPayment: {

            /**
            * Returns a XDR PaymentOp. A "payment" operation send the specified amount to the
            * destination account, optionally through a path. XLM payments create the destination
            * account if it does not exist.
            * @param {object} opts
            * @param {Asset} opts.sendAsset - The asset to pay with.
            * @param {string} opts.sendMax - The maximum amount of sendAsset to send.
            * @param {string} opts.destination - The destination account to send to.
            * @param {Asset} opts.destAsset - The asset the destination will receive.
            * @param {string} opts.destAmount - The amount the destination receives.
            * @param {Asset[]} opts.path - An array of Asset objects to use as the path.
            * @param {string} [opts.source] - The source account for the payment. Defaults to the transaction's source account.
            * @returns {xdr.PathPaymentOp}
            */

            value: function pathPayment(opts) {
                if (!opts.sendAsset) {
                    throw new Error("Must specify a send asset");
                }
                if (!this.isValidAmount(opts.sendMax)) {
                    throw new TypeError("sendMax argument must be of type String and represent a positive number");
                }
                if (!Keypair.isValidPublicKey(opts.destination)) {
                    throw new Error("destination is invalid");
                }
                if (!opts.destAsset) {
                    throw new Error("Must provide a destAsset for a payment operation");
                }
                if (!this.isValidAmount(opts.destAmount)) {
                    throw new TypeError("destAmount argument must be of type String and represent a positive number");
                }

                var attributes = {};
                attributes.sendAsset = opts.sendAsset.toXdrObject();
                attributes.sendMax = this._toXDRAmount(opts.sendMax);
                attributes.destination = Keypair.fromAccountId(opts.destination).xdrAccountId();
                attributes.destAsset = opts.destAsset.toXdrObject();
                attributes.destAmount = this._toXDRAmount(opts.destAmount);

                var path = opts.path ? opts.path : [];
                attributes.path = [];
                for (var i in path) {
                    attributes.path.push(path[i].toXdrObject());
                }

                var payment = new xdr.PathPaymentOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.pathPayment(payment);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        changeTrust: {

            /**
            * Returns an XDR ChangeTrustOp. A "change trust" operation adds, removes, or updates a
            * trust line for a given asset from the source account to another. The issuer being
            * trusted and the asset code are in the given Asset object.
            * @param {object} opts
            * @param {Asset} opts.asset - The asset for the trust line.
            * @param {string} [opts.limit] - The limit for the asset, defaults to max int64.
            *                                If the limit is set to "0" it deletes the trustline.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.ChangeTrustOp}
            */

            value: function changeTrust(opts) {
                var attributes = {};
                attributes.line = opts.asset.toXdrObject();
                if (!isUndefined(opts.limit) && !this.isValidAmount(opts.limit, true)) {
                    throw new TypeError("limit argument must be of type String and represent a number");
                }

                if (opts.limit) {
                    attributes.limit = this._toXDRAmount(opts.limit);
                } else {
                    attributes.limit = Hyper.fromString(new BigNumber(MAX_INT64).toString());
                }

                if (opts.source) {
                    attributes.source = opts.source ? opts.source.masterKeypair : null;
                }
                var changeTrustOP = new xdr.ChangeTrustOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.changeTrust(changeTrustOP);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        allowTrust: {

            /**
            * Returns an XDR AllowTrustOp. An "allow trust" operation authorizes another
            * account to hold your account's credit for a given asset.
            * @param {object} opts
            * @param {string} opts.trustor - The trusting account (the one being authorized)
            * @param {string} opts.assetCode - The asset code being authorized.
            * @param {boolean} opts.authorize - True to authorize the line, false to deauthorize.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.AllowTrustOp}
            */

            value: function allowTrust(opts) {
                if (!Keypair.isValidPublicKey(opts.trustor)) {
                    throw new Error("trustor is invalid");
                }
                var attributes = {};
                attributes.trustor = Keypair.fromAccountId(opts.trustor).xdrAccountId();
                if (opts.assetCode.length <= 4) {
                    var code = padEnd(opts.assetCode, 4, "\u0000");
                    attributes.asset = xdr.AllowTrustOpAsset.assetTypeCreditAlphanum4(code);
                } else if (opts.assetCode.length <= 12) {
                    var code = padEnd(opts.assetCode, 12, "\u0000");
                    attributes.asset = xdr.AllowTrustOpAsset.assetTypeCreditAlphanum12(code);
                } else {
                    throw new Error("Asset code must be 12 characters at max.");
                }
                attributes.authorize = opts.authorize;
                var allowTrustOp = new xdr.AllowTrustOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.allowTrust(allowTrustOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        setOptions: {

            /**
            * Returns an XDR SetOptionsOp. A "set options" operations set or clear account flags,
            * set the account's inflation destination, and/or add new signers to the account.
            * The account flags are the xdr.AccountFlags enum, which are:
            *   - AUTH_REQUIRED_FLAG = 0x1
            *   - AUTH_REVOCABLE_FLAG = 0x2
            *   - AUTH_IMMUTABLE_FLAG = 0x4
            * @param {object} opts
            * @param {string} [opts.inflationDest] - Set this account ID as the account's inflation destination.
            * @param {(number|string)} [opts.clearFlags] - Bitmap integer for which flags to clear.
            * @param {(number|string)} [opts.setFlags] - Bitmap integer for which flags to set.
            * @param {number|string} [opts.masterWeight] - The master key weight.
            * @param {number|string} [opts.lowThreshold] - The sum weight for the low threshold.
            * @param {number|string} [opts.medThreshold] - The sum weight for the medium threshold.
            * @param {number|string} [opts.highThreshold] - The sum weight for the high threshold.
            * @param {object} [opts.signer] - Add or remove a signer from the account. The signer is
            *                                 deleted if the weight is 0.
            * @param {string} [opts.signer.pubKey] - The public key of the new signer (old `address` field name is deprecated).
            * @param {number|string} [opts.signer.weight] - The weight of the new signer (0 to delete or 1-255)
            * @param {string} [opts.homeDomain] - sets the home domain used for reverse federation lookup.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.SetOptionsOp}
            */

            value: function setOptions(opts) {
                var attributes = {};

                if (opts.inflationDest) {
                    if (!Keypair.isValidPublicKey(opts.inflationDest)) {
                        throw new Error("inflationDest is invalid");
                    }
                    attributes.inflationDest = Keypair.fromAccountId(opts.inflationDest).xdrAccountId();
                }

                var weightCheckFunction = function (value, name) {
                    if (value >= 0 && value <= 255) {
                        return true;
                    } else {
                        throw new Error("" + name + " value must be between 0 and 255");
                    }
                };

                attributes.clearFlags = this._checkUnsignedIntValue("clearFlags", opts.clearFlags);
                attributes.setFlags = this._checkUnsignedIntValue("setFlags", opts.setFlags);
                attributes.masterWeight = this._checkUnsignedIntValue("masterWeight", opts.masterWeight, weightCheckFunction);
                attributes.lowThreshold = this._checkUnsignedIntValue("lowThreshold", opts.lowThreshold, weightCheckFunction);
                attributes.medThreshold = this._checkUnsignedIntValue("medThreshold", opts.medThreshold, weightCheckFunction);
                attributes.highThreshold = this._checkUnsignedIntValue("highThreshold", opts.highThreshold, weightCheckFunction);

                if (!isUndefined(opts.homeDomain) && !isString(opts.homeDomain)) {
                    throw new TypeError("homeDomain argument must be of type String");
                }
                attributes.homeDomain = opts.homeDomain;

                if (opts.signer) {
                    if (opts.signer.address) {
                        console.warn("signer.address is deprecated. Use signer.pubKey instead.");
                        opts.signer.pubKey = opts.signer.address;
                    }

                    if (!Keypair.isValidPublicKey(opts.signer.pubKey)) {
                        throw new Error("signer.pubKey is invalid");
                    }

                    if (!opts.signer.signerType && opts.signer.signerType !== 0) {
                        throw new Error("invalid signer type");
                    }

                    opts.signer.weight = this._checkUnsignedIntValue("signer.weight", opts.signer.weight, weightCheckFunction);

                    attributes.signer = new xdr.Signer({
                        pubKey: Keypair.fromAccountId(opts.signer.pubKey).xdrAccountId(),
                        weight: opts.signer.weight,
                        signerType: opts.signer.signerType

                    });
                }

                var setOptionsOp = new xdr.SetOptionsOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.setOption(setOptionsOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        manageOffer: {

            /**
            * Returns a XDR ManageOfferOp. A "manage offer" operation creates, updates, or
            * deletes an offer.
            * @param {object} opts
            * @param {Asset} opts.selling - What you're selling.
            * @param {Asset} opts.buying - What you're buying.
            * @param {string} opts.amount - The total amount you're selling. If 0, deletes the offer.
            * @param {number|string|BigNumber|Object} opts.price - The exchange rate ratio (selling / buying)
            * @param {number} opts.price.n - If `opts.price` is an object: the price numerator
            * @param {number} opts.price.d - If `opts.price` is an object: the price denominator
            * @param {number|string} [opts.offerId ]- If `0`, will create a new offer (default). Otherwise, edits an exisiting offer.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @throws {Error} Throws `Error` when the best rational approximation of `price` cannot be found.
            * @returns {xdr.ManageOfferOp}
            */

            value: function manageOffer(opts) {
                var attributes = {};
                attributes.selling = opts.selling.toXdrObject();
                attributes.buying = opts.buying.toXdrObject();
                if (!this.isValidAmount(opts.amount, true)) {
                    throw new TypeError("amount argument must be of type String and represent a positive number or zero");
                }
                attributes.amount = this._toXDRAmount(opts.amount);
                if (isUndefined(opts.price)) {
                    throw new TypeError("price argument is required");
                }
                attributes.price = this._toXDRPrice(opts.price);

                if (!isUndefined(opts.offerId)) {
                    opts.offerId = opts.offerId.toString();
                } else {
                    opts.offerId = "0";
                }
                attributes.offerId = UnsignedHyper.fromString(opts.offerId);
                var manageOfferOp = new xdr.ManageOfferOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.manageOffer(manageOfferOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        createPassiveOffer: {

            /**
            * Returns a XDR CreatePasiveOfferOp. A "create passive offer" operation creates an
            * offer that won't consume a counter offer that exactly matches this offer. This is
            * useful for offers just used as 1:1 exchanges for path payments. Use manage offer
            * to manage this offer after using this operation to create it.
            * @param {object} opts
            * @param {Asset} opts.selling - What you're selling.
            * @param {Asset} opts.buying - What you're buying.
            * @param {string} opts.amount - The total amount you're selling. If 0, deletes the offer.
            * @param {number|string|BigNumber|Object} opts.price - The exchange rate ratio (selling / buying)
            * @param {number} opts.price.n - If `opts.price` is an object: the price numerator
            * @param {number} opts.price.d - If `opts.price` is an object: the price denominator
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @throws {Error} Throws `Error` when the best rational approximation of `price` cannot be found.
            * @returns {xdr.CreatePassiveOfferOp}
            */

            value: function createPassiveOffer(opts) {
                var attributes = {};
                attributes.selling = opts.selling.toXdrObject();
                attributes.buying = opts.buying.toXdrObject();
                if (!this.isValidAmount(opts.amount)) {
                    throw new TypeError("amount argument must be of type String and represent a positive number");
                }
                attributes.amount = this._toXDRAmount(opts.amount);
                if (isUndefined(opts.price)) {
                    throw new TypeError("price argument is required");
                }
                attributes.price = this._toXDRPrice(opts.price);
                var createPassiveOfferOp = new xdr.CreatePassiveOfferOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.createPassiveOffer(createPassiveOfferOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        accountMerge: {

            /**
            * Transfers native balance to destination account.
            * @param {object} opts
            * @param {string} opts.destination - Destination to merge the source account into.
            * @param {string} [opts.source] - The source account (defaults to transaction source).
            * @returns {xdr.AccountMergeOp}
            */

            value: function accountMerge(opts) {
                var opAttributes = {};
                if (!Keypair.isValidPublicKey(opts.destination)) {
                    throw new Error("destination is invalid");
                }
                opAttributes.body = xdr.OperationBody.accountMerge(Keypair.fromAccountId(opts.destination).xdrAccountId());
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        inflation: {

            /**
            * This operation generates the inflation.
            * @param {object} [opts]
            * @param {string} [opts.source] - The optional source account.
            * @returns {xdr.InflationOp}
            */

            value: function inflation() {
                var opts = arguments[0] === undefined ? {} : arguments[0];

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.inflation();
                this.setSourceAccount(opAttributes, opts);
                return new xdr.Operation(opAttributes);
            }
        },
        manageData: {

            /**
             * This operation adds data entry to the ledger.
             * @param {object} opts
             * @param {string} opts.name - The name of the data entry.
             * @param {string|Buffer} opts.value - The value of the data entry.
             * @param {string} [opts.source] - The optional source account.
             * @returns {xdr.ManageDataOp}
             */

            value: function manageData(opts) {
                var attributes = {};

                if (!(isString(opts.name) && opts.name.length <= 64)) {
                    throw new Error("name must be a string, up to 64 characters");
                }
                attributes.dataName = opts.name;

                if (!isString(opts.value) && !Buffer.isBuffer(opts.value) && opts.value !== null) {
                    throw new Error("value must be a string, Buffer or null");
                }

                if (isString(opts.value)) {
                    attributes.dataValue = new Buffer(opts.value);
                } else {
                    attributes.dataValue = opts.value;
                }

                if (attributes.dataValue !== null && attributes.dataValue.length > 64) {
                    throw new Error("value cannot be longer that 64 bytes");
                }

                var manageDataOp = new xdr.ManageDataOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.manageDatum(manageDataOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        setMaxReversalDuration: {

            /**
            * Updates max reversal duration options
            * @param {string|Number} maxDuration - max reversal duration in seconds
            * @returns {Promise} Returns a promise to the error if failed to set max reversal duration
            */

            value: function setMaxReversalDuration(maxDuration) {
                if (isUndefined(maxDuration)) {
                    throw new Error("maxDuration must be a number or string");
                }

                var attrs = {
                    max_reversal_duration: maxDuration.toString()
                };
                return this._createAdministrativeOp(ADMIN_OP_MAX_REVERSAL_DURATION, attrs);
            }
        },
        setCommission: {

            /**
            * Creates or update commission object
            * @param {object} opts
            * @param {string} [opts.from] source of operations 
            * @param {string} [opts.to] destination of operation
            * @param {string} [opts.from_type] source account type
            * @param {string} [opts.to_type] destination type
            * @param {Asset} [opts.asset] - The asset of commission
            * @param {string} flat_fee - flat fee
            * @param {string} percent_fee - percent fee
            * @returns {Promise} Returns a promise to the error if failed to set commission
            */

            value: function setCommission(opts, flat_fee, percent_fee) {
                if (!this.isValidAmount(flat_fee, true)) {
                    throw new TypeError("flat_fee argument must be of type String and represent nonnegative number");
                }

                if (!this.isValidAmount(percent_fee, true)) {
                    throw new TypeError("percent_fee argument must be of type String and represent nonnegative number");
                }

                var attrs = {
                    flat_fee: this._toXDRAmount(flat_fee).toString(),
                    percent_fee: this._toXDRAmount(percent_fee).toString() };

                if (isUndefined(opts)) {
                    throw new TypeError("opts must be object");
                }

                this._setCommissionKey(opts, attrs);

                return this._createAdministrativeOp(ADMIN_OP_COMMISSION, attrs);
            }
        },
        _setCommissionKey: {
            value: function _setCommissionKey(source, dest) {

                if (source.from) {
                    dest.from = source.from;
                }

                if (source.to) {
                    dest.to = source.to;
                }

                if (source.from_type) {
                    dest.from_type = source.from_type;
                }

                if (source.to_type) {
                    dest.to_type = source.to_type;
                }

                if (source.asset) {
                    dest.asset_type = source.asset.getAssetType();
                    if (!source.asset.isNative()) {
                        dest.asset_code = source.asset.getCode();
                        dest.asset_issuer = source.asset.getIssuer();
                    }
                }
            }
        },
        deleteCommission: {

            /**
             * Deletes commission
             * @param {object} key
             * @param {string} [key.from] source of operations 
             * @param {string} [key.to] destination of operation
             * @param {string} [key.from_type] source account type
             * @param {string} [key.to_type] destination type
             * @param {Asset} [key.asset] - The asset of commission
             */

            value: function deleteCommission(key) {
                var attrs = {
                    "delete": "true"
                };

                this._setCommissionKey(key, attrs);

                return this._createAdministrativeOp(ADMIN_OP_COMMISSION, attrs);
            }
        },
        setAgentLimits: {

            /**
             * Sets limits for specified account
             * @param {string} accountId - account id of account for which limits will be set 
             * @param {string} asset_code - defines asset of operation for which limits will be set
             * @param {object} limit
             * @param {string} [limit.max_operation_out] - defines max number of outgoing ops
             * @param {string} [limit.daily_max_out] - daily_max_out
             * @param {string} [limit.monthly_max_out] - defines monthly_max_out
             * @param {string} [limit.max_operation_in] - defines max_operation_in
             * @param {string} [limit.daily_max_in] - defines daily_max_in
             * @param {string} [limit.monthly_max_in] - defines monthly_max_in
             */

            value: function setAgentLimits(accountId, asset_code, limit) {
                if (!isString(asset_code)) {
                    throw new TypeError("asset_code argument must be of type String");
                }

                if (!isString(accountId)) {
                    throw new TypeError("accountId argument must be of type String");
                }

                var attrs = {
                    asset_code: asset_code,
                    account_id: accountId
                };

                attrs.max_operation_out = this._toLimitAmount(limit.max_operation_out);
                if (isEmpty(attrs.max_operation_out)) {
                    throw new TypeError("limit.max_operation_out argument must be of type String");
                }

                attrs.daily_max_out = this._toLimitAmount(limit.daily_max_out);
                if (isEmpty(attrs.daily_max_out)) {
                    throw new TypeError("limit.daily_max_out argument must be of type String");
                }

                attrs.monthly_max_out = this._toLimitAmount(limit.monthly_max_out);
                if (isEmpty(attrs.monthly_max_out)) {
                    throw new TypeError("limit.monthly_max_out argument must be of type String");
                }

                attrs.max_operation_in = this._toLimitAmount(limit.max_operation_in);
                if (isEmpty(attrs.max_operation_in)) {
                    throw new TypeError("limit.max_operation_in argument must be of type String");
                }

                attrs.daily_max_in = this._toLimitAmount(limit.daily_max_in);
                if (isEmpty(attrs.daily_max_in)) {
                    throw new TypeError("limit.daily_max_in argument must be of type String");
                }

                attrs.monthly_max_in = this._toLimitAmount(limit.monthly_max_in);
                if (isEmpty(attrs.monthly_max_in)) {
                    throw new TypeError("limit.monthly_max_in argument must be of type String");
                }

                return this._createAdministrativeOp(ADMIN_OP_ACCOUNT_LIMITS, attrs);
            }
        },
        _toLimitAmount: {
            value: function _toLimitAmount(limit) {
                if (isUndefined(limit) || limit === "-1") {
                    return "-1";
                }

                if (!this.isValidAmount(limit)) {
                    return "";
                }

                return this._toXDRAmount(limit).toString();
            }
        },
        restrictAgentAccount: {

            /**
             * Creates administrative op with set traits action.
             * @param {string} accountId - account for which traits will be applied
             * @param {bool} [block_outcoming] - if true, block out txs
             * @param {bool} [block_incoming] - if true, blocks incoming transactions
             */

            value: function restrictAgentAccount(accountId, block_outcoming, block_incoming) {
                if (!isString(accountId)) {
                    throw new TypeError("accountId argument must be of type String");
                }

                var restrictions = {
                    account_id: accountId
                };

                if (typeof block_outcoming !== "undefined") {
                    if (!isBoolean(block_outcoming)) {
                        throw new TypeError("block_outcoming argument must be of type Boolean");
                    }
                    restrictions.block_outcoming_payments = block_outcoming.toString();
                }

                if (typeof block_incoming !== "undefined") {
                    if (!isBoolean(block_incoming)) {
                        throw new TypeError("block_incoming argument must be of type Boolean");
                    }
                    restrictions.block_incoming_payments = block_incoming.toString();
                }

                return this._createAdministrativeOp(ADMIN_OP_TRAITS, restrictions);
            }
        },
        manageAssets: {

            /** Manages assets. If Asset does not exists - creates one, or updates
             * @param {Asset} asset - The asset to be managed
             * @param {boolean} isAnonymous - Defines if asset must be anonymous
             * @param {boolean} [isDelete] - Defines if asset must be deleted
             */

            value: function manageAssets(asset, isAnonymous, isDelete) {
                if (typeof asset === "undefined") {
                    throw new TypeError("asset argument must be of type object");
                }
                var attrs = {
                    asset_type: asset.getAssetType()
                };
                if (!asset.isNative()) {
                    attrs.asset_code = asset.getCode();
                    attrs.asset_issuer = asset.getIssuer();
                }
                if (!isBoolean(isAnonymous)) {
                    throw new TypeError("isAnonymous argument must be of type Boolean");
                }
                attrs.is_anonymous = isAnonymous.toString();

                if (typeof isDelete !== "undefined") {
                    if (!isBoolean(isDelete)) {
                        throw new TypeError("isDelete argument must be of type Boolean");
                    }
                    attrs["delete"] = isDelete.toString();
                }

                return this._createAdministrativeOp(ADMIN_OP_ASSET, attrs);
            }
        },
        paymentReversal: {

            /**
            * Create a payment reversal operation.
            * @param {object} opts
            * @param {string} opts.paymentSource - Source of reversing payment.
            * @param {Asset} opts.asset - The asset of payment to be reversed.
            * @param {string} opts.amount - The amount of payment to be reversed.
            * @param {string} opts.commissionAmount - The commission amount of payment to be reversed.
            * @param {number|string} opts.paymentID -ID of payment to be reversed
            * @param {string} [opts.source] - The source account for the payment. Defaults to the transaction's source account.
            * @returns {xdr.PaymentOp}
            */

            value: function paymentReversal(opts) {
                if (!Keypair.isValidPublicKey(opts.paymentSource)) {
                    throw new Error("destination is invalid");
                }
                if (!opts.asset) {
                    throw new Error("Must provide an asset for a payment operation");
                }
                if (!this.isValidAmount(opts.amount)) {
                    throw new TypeError("amount argument must be of type String and represent a positive number");
                }
                if (!this.isValidAmount(opts.commissionAmount)) {
                    throw new TypeError("commissionAmount argument must be of type String and represent a positive number");
                }

                if (isUndefined(opts.paymentID)) {
                    throw new TypeError("paymentID argument must be of type String or Number");
                }

                var attributes = {};
                attributes.paymentId = Hyper.fromString(opts.paymentID.toString());
                attributes.paymentSource = Keypair.fromAccountId(opts.paymentSource).xdrAccountId();
                attributes.asset = opts.asset.toXdrObject();
                attributes.amount = this._toXDRAmount(opts.amount);
                attributes.commissionAmount = this._toXDRAmount(opts.commissionAmount);
                var paymentReversal = new xdr.PaymentReversalOp(attributes);

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.paymentReversal(paymentReversal);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        _createAdministrativeOp: {

            /**
             * Creates AdministrativeOp
             * @param {string} name - name of operation
             * @param {object} opts - data to be added as OpData
             */

            value: function _createAdministrativeOp(name, opts) {
                if (!isString(name)) throw new TypeError("name argument must be of type String");
                var opData = {};
                opData[name] = opts;
                var opStrData = JSON.stringify(opData);
                var adminOp = new xdr.AdministrativeOp({ opData: opStrData });

                var opAttributes = {};
                opAttributes.body = xdr.OperationBody.administrative(adminOp);
                this.setSourceAccount(opAttributes, opts);

                return new xdr.Operation(opAttributes);
            }
        },
        setSourceAccount: {
            value: function setSourceAccount(opAttributes, opts) {
                if (opts.source) {
                    if (!Keypair.isValidPublicKey(opts.source)) {
                        throw new Error("Source address is invalid");
                    }
                    opAttributes.sourceAccount = Keypair.fromAccountId(opts.source).xdrAccountId();
                }
            }
        },
        operationToObject: {

            /**
            * Converts the XDR Operation object to the opts object used to create the XDR
            * operation.
            * @param {xdr.Operation} operation - An XDR Operation.
            * @return {Operation}
            */

            value: function operationToObject(operation) {
                function accountIdtoAddress(accountId) {
                    return encodeCheck("accountId", accountId.ed25519());
                }

                var result = {};
                if (operation.sourceAccount()) {
                    result.source = accountIdtoAddress(operation.sourceAccount());
                }

                var attrs = operation.body().value();
                switch (operation.body()["switch"]().name) {
                    case "createAccount":
                        result.type = "createAccount";
                        result.destination = accountIdtoAddress(attrs.destination());
                        result.accountType = attrs.body()["switch"]().value;
                        break;
                    case "payment":
                        result.type = "payment";
                        result.destination = accountIdtoAddress(attrs.destination());
                        result.asset = Asset.fromOperation(attrs.asset());
                        result.amount = this._fromXDRAmount(attrs.amount());
                        break;
                    case "externalPayment":
                        result.type = "externalPayment";
                        result.exchangeAgent = accountIdtoAddress(attrs.exchangeAgent());
                        result.destinationBank = accountIdtoAddress(attrs.destinationBank());
                        result.destinationAccount = accountIdtoAddress(attrs.destinationAccount());
                        result.asset = Asset.fromOperation(attrs.asset());
                        result.amount = this._fromXDRAmount(attrs.amount());
                        break;
                    case "pathPayment":
                        result.type = "pathPayment";
                        result.sendAsset = Asset.fromOperation(attrs.sendAsset());
                        result.sendMax = this._fromXDRAmount(attrs.sendMax());
                        result.destination = accountIdtoAddress(attrs.destination());
                        result.destAsset = Asset.fromOperation(attrs.destAsset());
                        result.destAmount = this._fromXDRAmount(attrs.destAmount());
                        var path = attrs.path();
                        result.path = [];
                        for (var i in path) {
                            result.path.push(Asset.fromOperation(path[i]));
                        }
                        break;
                    case "changeTrust":
                        result.type = "changeTrust";
                        result.line = Asset.fromOperation(attrs.line());
                        result.limit = this._fromXDRAmount(attrs.limit());
                        break;
                    case "allowTrust":
                        result.type = "allowTrust";
                        result.trustor = accountIdtoAddress(attrs.trustor());
                        result.assetCode = attrs.asset().value().toString();
                        result.assetCode = trimEnd(result.assetCode, "\u0000");
                        result.authorize = attrs.authorize();
                        break;
                    case "setOption":
                        result.type = "setOptions";
                        if (attrs.inflationDest()) {
                            result.inflationDest = accountIdtoAddress(attrs.inflationDest());
                        }

                        result.clearFlags = attrs.clearFlags();
                        result.setFlags = attrs.setFlags();
                        result.masterWeight = attrs.masterWeight();
                        result.lowThreshold = attrs.lowThreshold();
                        result.medThreshold = attrs.medThreshold();
                        result.highThreshold = attrs.highThreshold();
                        result.homeDomain = attrs.homeDomain();

                        if (attrs.signer()) {
                            var signer = {};
                            signer.pubKey = accountIdtoAddress(attrs.signer().pubKey());
                            signer.weight = attrs.signer().weight();
                            signer.signerType = attrs.signer().signerType();
                            result.signer = signer;
                        }
                        break;
                    case "manageOffer":
                        result.type = "manageOffer";
                        result.selling = Asset.fromOperation(attrs.selling());
                        result.buying = Asset.fromOperation(attrs.buying());
                        result.amount = this._fromXDRAmount(attrs.amount());
                        result.price = this._fromXDRPrice(attrs.price());
                        result.offerId = attrs.offerId().toString();
                        break;
                    case "createPassiveOffer":
                        result.type = "createPassiveOffer";
                        result.selling = Asset.fromOperation(attrs.selling());
                        result.buying = Asset.fromOperation(attrs.buying());
                        result.amount = this._fromXDRAmount(attrs.amount());
                        result.price = this._fromXDRPrice(attrs.price());
                        break;
                    case "accountMerge":
                        result.type = "accountMerge";
                        result.destination = accountIdtoAddress(attrs);
                        break;
                    case "manageDatum":
                        result.type = "manageData";
                        result.name = attrs.dataName();
                        result.value = attrs.dataValue();
                        break;
                    case "inflation":
                        result.type = "inflation";
                        break;
                    case "administrative":
                        result.type = "administrative";
                        result.opData = attrs.opData();
                        break;
                    case "paymentReversal":
                        result.type = "paymentReversal";
                        result.paymentSource = accountIdtoAddress(attrs.paymentSource());
                        result.asset = Asset.fromOperation(attrs.asset());
                        result.amount = this._fromXDRAmount(attrs.amount());
                        result.commissionAmount = this._fromXDRAmount(attrs.commissionAmount());
                        result.paymentID = attrs.paymentId().toString();
                        break;
                    default:
                        throw new Error("Unknown operation");
                }
                return result;
            }
        },
        isValidAmount: {
            value: function isValidAmount(value) {
                var allowZero = arguments[1] === undefined ? false : arguments[1];

                if (!isString(value)) {
                    return false;
                }

                var amount = undefined;
                try {
                    amount = new BigNumber(value);
                } catch (e) {
                    return false;
                }

                // == 0
                if (!allowZero && amount.isZero()) {
                    return false;
                }

                // < 0
                if (amount.isNegative()) {
                    return false;
                }

                // > Max value
                if (amount.times(ONE).greaterThan(new BigNumber(MAX_INT64).toString())) {
                    return false;
                }

                // Decimal places (max 7)
                if (amount.decimalPlaces() > 7) {
                    return false;
                }

                // Infinity
                if (!amount.isFinite()) {
                    return false;
                }

                // NaN
                if (amount.isNaN()) {
                    return false;
                }

                return true;
            }
        },
        _checkUnsignedIntValue: {

            /**
             * Returns value converted to uint32 value or undefined.
             * If `value` is not `Number`, `String` or `Undefined` then throws an error.
             * Used in {@link Operation.setOptions}.
             * @private
             * @param {string} name Name of the property (used in error message only)
             * @param {*} value Value to check
             * @param {function(value, name)} isValidFunction Function to check other constraints (the argument will be a `Number`)
             * @returns {undefined|Number}
             * @private
             */

            value: function _checkUnsignedIntValue(name, value) {
                var isValidFunction = arguments[2] === undefined ? null : arguments[2];

                if (isUndefined(value)) {
                    return undefined;
                }

                if (isString(value)) {
                    value = parseFloat(value);
                }

                if (!isNumber(value) || !isFinite(value) || value % 1 !== 0) {
                    throw new Error("" + name + " value is invalid");
                }

                if (value < 0) {
                    throw new Error("" + name + " value must be unsigned");
                }

                if (!isValidFunction || isValidFunction && isValidFunction(value, name)) {
                    return value;
                }

                throw new Error("" + name + " value is invalid");
            }
        },
        _toXDRAmount: {

            /**
             * @private
             */

            value: function _toXDRAmount(value) {
                var amount = new BigNumber(value).mul(ONE);
                return Hyper.fromString(amount.toString());
            }
        },
        _fromXDRAmount: {

            /**
             * @private
             */

            value: function _fromXDRAmount(value) {
                return new BigNumber(value).div(ONE).toString();
            }
        },
        _fromXDRPrice: {

            /**
             * @private
             */

            value: function _fromXDRPrice(price) {
                var n = new BigNumber(price.n());
                return n.div(new BigNumber(price.d())).toString();
            }
        },
        _accountTypeFromNumber: {
            value: function _accountTypeFromNumber(rawAccountType) {
                if (!this._isValidAccountType(rawAccountType)) {
                    throw new Error("XDR Read Error: Unknown AccountType member for value " + rawAccountType);
                }

                return xdr.AccountType._byValue.get(rawAccountType);
            }
        },
        _isValidAccountType: {
            value: function _isValidAccountType(rawAccountType) {
                return xdr.AccountType._byValue.has(rawAccountType);
            }
        },
        _toXDRPrice: {

            /**
             * @private
             */

            value: function _toXDRPrice(price) {
                var xdrObject = undefined;
                if (price.n && price.d) {
                    xdrObject = new xdr.Price(price);
                } else {
                    price = new BigNumber(price);
                    var approx = best_r(price);
                    xdrObject = new xdr.Price({
                        n: parseInt(approx[0]),
                        d: parseInt(approx[1])
                    });
                }

                if (xdrObject.n() < 0 || xdrObject.d() < 0) {
                    throw new Error("price must be positive");
                }

                return xdrObject;
            }
        }
    });

    return Operation;
})();