/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */

const { Router } = require('express');
const wrapper = require('../../lib/request-handler');
const TrajectoryHandler = require('../../lib/trajectory-handler');
const DateHandler = require('../../lib/date-handler');
const WatcherCatchersService = require('./watcherCatchers.service');
const upload = require('../../lib/file-upload');
const {
  BadRequestException,
  ForbiddenException,
} = require('../../common/exceptions');
const { verifyUser } = require('../../middlewares/auth.middleware');

class WatcherCatchersController {
  /** @param { WatcherCatchersService } watcherCatchersService */
  constructor(watcherCatchersService) {
    this.watcherCatchersService = watcherCatchersService;
    this.path = '/watcher-catchers';
    this.router = Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // this.router.use(verifyUser);
    this.router
      .get('/', wrapper(this.readWatcherCatchers.bind(this)))
      .get('/:dbId', wrapper(this.findWatcherCatchers.bind(this)))
      .delete('/:dbId', wrapper(this.deleteWatcherCatchers.bind(this)))
      .post('/', wrapper(this.predictWatcherCatchers.bind(this)));
  }

  async readWatcherCatchers(req, _res) {
    const { email } = req.user;
    const data = await this.watcherCatchersService.readWatcherCatchers(email);
    return { data };
  }

  async findWatcherCatchers(req, _res) {
    const { email } = req.user;
    const { dbId } = req.params;
    if (!dbId) {
      throw new BadRequestException('Param is empty.');
    }
    const data = await this.watcherCatchersService.findWatcherCatchers(dbId);
    return { data };
  }

  async deleteWatcherCatchers(req, _res) {
    const { dbId } = req.params;
    if (!dbId) {
      throw new BadRequestException('Wrong param.');
    }
    const data = await this.watcherCatchersService.deleteWatcherCatchers(dbId);
    return { data };
  }

  async predictWatcherCatchers(req, _res) {
    if (!DateHandler.isCalculatableDate()) {
      throw new ForbiddenException('Not available time.');
    }
    const { email } = req.user;
    // const email = '2018008168@hanyang.ac.kxr';

    const startMomentOfPredictionWindow =
      await DateHandler.getStartMomentOfPredictionWindow();

    const threshold = 50; // km
    const { longitude, latitude, altitude, fieldOfView, epochTime, endTime } =
      req.body;
    // const latitude = '127';
    // const longitude = '37';
    // const altitude = 2000;
    // const fieldOfView = 50;
    // const epochTime = new Date();
    // const endTime = new Date('2022-07-20T06:03:26.583Z');

    const taskId = await this.watcherCatchersService.enqueTask(
      email,
      Number(latitude),
      Number(longitude),
      altitude,
      fieldOfView,
      epochTime,
      endTime,
      startMomentOfPredictionWindow,
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

module.exports = WatcherCatchersController;
