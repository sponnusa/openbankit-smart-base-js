import base32 from "rfc-3548-b32";
import crc from "crc";
import contains from "lodash/includes";
import isUndefined from "lodash/isUndefined";
import isNull from "lodash/isNull";
import isString from "lodash/isString";

const versionBytes = {
  accountId:      0x30,    // "G" in base32
  seed:           0x90,    // "S" in base32
  mpriv:          0x60,    // "M" in base32
  mpub:           0x78,    // "P" in base32
  privWallet:     0xb0,    // "W" in base32
  pubWallet:      0xc8,    // "Z" in base32
  hdk:            0x50     // "K" in base32
};

export function decodeCheck(versionByteName, encoded) {
  if (!isString(encoded)) {
    throw new TypeError('encoded argument must be of type String');
  }

  let decoded     = base32.decode(encoded);
  let versionByte = decoded[0];
  let payload     = decoded.slice(0, -2);
  let data        = payload.slice(1);
  let checksum    = decoded.slice(-2);

  if (encoded != base32.encode(decoded)) {
    throw new Error('invalid encoded string');
  }

  let expectedVersion = versionBytes[versionByteName];

  if (isUndefined(expectedVersion)) {
    throw new Error(`${versionByteName} is not a valid version byte name.  expected one of "accountId" or "seed"`);
  }

  if (versionByte !== expectedVersion) {
    throw new Error(`invalid version byte. expected ${expectedVersion}, got ${versionByte}`);
  }

  let expectedChecksum = calculateChecksum(payload);

  if (!verifyChecksum(expectedChecksum, checksum)) {
    throw new Error(`invalid checksum`);
  }

  return new Buffer(data);
}

export function encodeCheck(versionByteName, data) {
  if (isNull(data) || isUndefined(data)) {
    throw new Error("cannot encode null data");
  }

  let versionByte = versionBytes[versionByteName];

  if (isUndefined(versionByte)) {
    throw new Error(`${versionByteName} is not a valid version byte name.  expected one of "accountId" or "seed"`);
  }

  data              = new Buffer(data);
  let versionBuffer = new Buffer([versionByte]);
  let payload       = Buffer.concat([versionBuffer, data]);
  let checksum      = calculateChecksum(payload);
  let unencoded     = Buffer.concat([payload, checksum]);

  return base32.encode(unencoded);
}

function calculateChecksum(payload) {
  // This code calculates CRC16-XModem checksum of payload
  // and returns it as Buffer in little-endian order.
  let checksum = new Buffer(2);
  checksum.writeUInt16LE(crc.crc16xmodem(payload), 0);
  return checksum;
}

function verifyChecksum(expected, actual) {
  if (expected.length !== actual.length) {
    return false;
  }

  if (expected.length === 0) {
    return true;
  }

  for(let i = 0; i < expected.length; i++) {
    if (expected[i] !== actual[i]) {
      return false;
    }
  }

  return true;
}
