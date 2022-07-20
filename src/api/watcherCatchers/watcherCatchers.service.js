/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
// const WatcherCatchersModel = require('./watcherCatchers.model');
const { default: mongoose } = require('mongoose');
const { Mutex } = require('async-mutex');
const {
  WatcherCatchersModel,
  WatcherCatchersTaskModel,
} = require('./watcherCatchers.model');
const WcdbModel = require('../wcdb/wcdb.model');
const WcdbService = require('../wcdb/wcdb.service');
const {
  BadRequestException,
  HttpException,
} = require('../../common/exceptions');
const WatcherCatchersHandler = require('../../lib/watcherCatcher-handler');
const Cesium = require('cesium');
const moment = require('moment');

class WatcherCatchersService {
  /** @param { WcdbService } wcdbService */
  constructor(wcdbService) {
    this.wcdbService = wcdbService;
    this.mutex = new Mutex();
  }

  async readWatcherCatchers(email) {
    const result = await WatcherCatchersModel.find({ email });
    return result;
  }

  async findWatcherCatchers(placeId) {
    const taskResult = await WatcherCatchersModel.findById(placeId);
    if (!taskResult) {
      throw new BadRequestException('No such task.');
    }
    const { status } = taskResult;
    if (status !== 'DONE') {
      throw new BadRequestException('Job has not finished.');
    }
    const wcdbResult = await WcdbModel.find({ placeId });
    const watcherCatchersResult = {
      latitude: taskResult.latitude,
      longitude: taskResult.longitude,
      epochTime: taskResult.epochTime,
      predictionEpochTime: taskResult.predictionEpochTime,
      wcdb: wcdbResult,
    };
    return watcherCatchersResult;
  }

  async deleteWatcherCatchers(placeId) {
    await WatcherCatchersModel.deleteMany({
      _id: mongoose.Types.ObjectId(placeId),
    });
    return WcdbModel.deleteMany({ placeId }).exec();
  }

  async enqueTaskOnDb(
    taskId,
    remoteInputFilePath,
    remoteOutputFilePath,
    threshold,
    localOutputPath,
  ) {
    const task = {
      taskId,
      remoteInputFilePath,
      remoteOutputFilePath,
      threshold,
      localOutputPath,
    };
    console.log(await WatcherCatchersTaskModel.create(task));
  }

  async popTaskFromDb() {
    const task = await WatcherCatchersTaskModel.findOneAndDelete({})
      .sort({ createdAt: 1 })
      .exec();
    return task;
  }

  async enqueTask(
    email,
    latitude,
    longitude,
    epochTime,
    predictionEpochTime,
    threshold,
  ) {
    const position = await this.degreesToCartesian3(longitude, latitude);
    console.log(position);
    epochTime = new Date(epochTime);
    const result = await WatcherCatchersModel.create({
      email,
      latitude,
      longitude,
      localX: position.x,
      localY: position.y,
      localZ: position.z,
      status: 'PENDING',
      epochTime,
      predictionEpochTime,
      threshold,
    });
    if (!result) {
      throw new HttpException(
        500,
        'Internal server error. (cannot enque task into db.)',
      );
    }
    // eslint-disable-next-line no-underscore-dangle
    const taskId = result._id.toString();

    const uniqueSuffix = `${moment().format('YYYY-MM-DD-hh:mm:ss')}`;
    const filename = `${email}-WC-${uniqueSuffix}.txt`;
    const {
      remoteFolder,
      remoteInputFilePath,
      remoteOutputFilePath,
      localOutputPath,
    } = WatcherCatchersHandler.makeFilePath(email, filename);

    await this.mutex.runExclusive(async () => {
      await WatcherCatchersHandler.putParametersRemoteServer(
        remoteFolder,
        remoteInputFilePath,
        remoteOutputFilePath,
        epochTime,
        position.x,
        position.y,
        position.z,
      );
    });

    await this.enqueTaskOnDb(
      taskId,
      remoteInputFilePath,
      remoteOutputFilePath,
      threshold,
      localOutputPath,
    );

    return taskId;
  }

  async updateTaskStatusSuceess(taskId, wcdbFilePath) {
    return WatcherCatchersModel.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(taskId) },
      { status: 'DONE', wcdbFilePath },
    );
  }

  async updateTaskStatusFailed(taskId, wcdbFilePath, errorMessage) {
    const result = await WatcherCatchersModel.findOneAndUpdate(
      { _id: mongoose.Types.ObjectId(taskId) },
      { status: 'ERROR', errorMessage, wcdbFilePath },
    );
  }

  async degreesToCartesian3(longitude, latitude) {
    console.log(longitude, latitude);
    longitude = Number(longitude);
    latitude = Number(latitude);
    console.log(longitude, latitude);
    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
    return position;
  }
}
module.exports = WatcherCatchersService;
