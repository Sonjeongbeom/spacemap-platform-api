/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */

const { Router } = require('express');
const wrapper = require('../../lib/request-handler');
const LaunchConjunctionsService = require('./launchConjunctions.service');
const TrajectoryHandler = require('../../lib/trajectory-handler');
const DateHandler = require('../../lib/date-handler');
const { memoryUpload } = require('../../lib/file-upload');
const {
  BadRequestException,
  ForbiddenException,
} = require('../../common/exceptions');
const { verifyUser } = require('../../middlewares/auth.middleware');

class LaunchConjunctionsController {
  /** @param { LaunchConjunctionsService } launchConjunctionsService */
  constructor(launchConjunctionsService) {
    this.launchConjunctionsService = launchConjunctionsService;
    this.path = '/launch-conjunctions';
    this.router = Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.use(verifyUser);
    this.router
      .get('/', wrapper(this.readLaunchConjunctions.bind(this)))
      .get('/:dbId', wrapper(this.findLaunchConjunctions.bind(this)))
      .delete('/:dbId', wrapper(this.deleteLaunchConjunctions.bind(this)))
      .post(
        '/',
        memoryUpload.single('trajectory'),
        wrapper(this.predictLaunchConjunctions.bind(this)),
      );
  }

  async readLaunchConjunctions(req, _res) {
    const { email } = req.user;
    const data = await this.launchConjunctionsService.readLaunchConjunctions(
      email,
    );
    return { data };
  }

  async findLaunchConjunctions(req, _res) {
    const { email } = req.user;
    const { dbId } = req.params;
    if (!dbId) {
      throw new BadRequestException('Param is empty.');
    }
    const data = await this.launchConjunctionsService.findLaunchConjunctions(
      dbId,
    );
    return { data };
  }

  async deleteLaunchConjunctions(req, _res) {
    const { dbId } = req.params;
    if (!dbId) {
      throw new BadRequestException('Wrong param.');
    }
    const data = await this.launchConjunctionsService.deleteLaunchConjunctions(
      dbId,
    );
    return { data };
  }

  async predictLaunchConjunctions(req, _res) {
    const { email } = request.user;
    const { file } = req;
    const { threshold } = req.body;

    if (!DateHandler.isCalculatableDate()) {
      throw new ForbiddenException('Not available time.');
    }
    if (!file) {
      throw new BadRequestException('No Trajectory File.');
    }
    if (!threshold) {
      throw new BadRequestException('Empty Threshold field.');
    }

    const {
      timeAndPositionArray,
      coordinateSystem,
      site,
      launchEpochTime,
      trajectoryLength,
    } = await TrajectoryHandler.parseTrajectoryAndGetInfo(file);

    file.buffer = await TrajectoryHandler.updateTrajectoryBuffer(
      timeAndPositionArray,
      coordinateSystem,
      site,
      launchEpochTime,
    );

    const { s3FileName, s3Path } = await TrajectoryHandler.uploadToS3AndGetUrl(
      email,
      file,
    );

    const predictionEpochTime =
      await DateHandler.getStartMomentOfPredictionWindow();

    const taskId = await this.launchConjunctionsService.enqueTask(
      email,
      s3FileName,
      s3Path,
      launchEpochTime,
      predictionEpochTime,
      trajectoryLength,
      threshold,
    );

    return {
      message: 'Request success.',
      data: {
        taskId,
      },
    };
  }
}

module.exports = LaunchConjunctionsController;
