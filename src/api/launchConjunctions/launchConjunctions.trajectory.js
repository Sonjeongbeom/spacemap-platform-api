/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */

const moment = require('moment');
const path = require('path');
const S3Handler = require('../../lib/s3-handler');
const DateHandler = require('../../lib/date-handler');
const StringHandler = require('../..lib/string-handler');
const {
  BadRequestException,
} = require('../../common/exceptions/badRequest.exception');

class Trajectory {
  constructor;
  static #isAllValidParams(time, x, y, z) {
    return (
      StringHandler.isValidString(time) &&
      StringHandler.isValidString(x) &&
      StringHandler.isValidString(y) &&
      StringHandler.isValidString(z)
    );
  }
}

module.exports = Trajectory;
