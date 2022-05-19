/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
// eslint-disable-next-line no-unused-vars
const PpdbService = require('./ppdb.service');
const DateHandler = require('../../lib/date-handler');
const PpdbHandler = require('../../lib/ppdb-handler');
const SftpHandler = require('../../lib/sftp-handler');
const EngineCommand = require('../../lib/engine-command');

class PpdbTask {
  #FROM_PPDB_PATH = '/data/COOP/workingFolder/PPDB2.txt';

  /** @param { PpdbService } ppdbService */
  constructor(ppdbService) {
    this.name = 'PPDB TASK';
    this.period = '0 14 15 * * *';
    // this.period = '0 0 15 * * *';
    this.excuting = false;
    this.handler = this.#ppdbScheduleHandler.bind(this);
    this.sftpHandler = new SftpHandler();
    this.ppdbService = ppdbService;
  }

  async #ppdbScheduleHandler(dateObj) {
    if (this.excuting) {
      return;
    }
    this.excuting = true;
    console.log('ppdb scheduler start.');
    const currDateFileName = DateHandler.getFileNameByDateObject(dateObj);
    const ppdbPath = `./public/ppdb/${currDateFileName}.txt`;
    const ppdbFileName = `${currDateFileName}.txt`;
    const tlePath = `public/tle/${currDateFileName}.tle`;
    const tleFileName = `${currDateFileName}.tle`;
    // --------------------------calculate PPDB----------------------------//
    try {
      const tomorrow = DateHandler.getTomorrow();
      const year = tomorrow.year();
      const month = tomorrow.month() + 1;
      const date = tomorrow.date();
      // EngineCommand.startMomentOfPredictionWindow = tomorrow;
      DateHandler.setStartMomentOfPredictionWindow(tomorrow);
      DateHandler.setEndMomentOfPredictionWindow(tomorrow.clone().diff(2, 'd'));
      const predictionCommand = EngineCommand.makePredictionCommandContext(
        tleFileName,
        year,
        month,
        date
      );
      await PpdbHandler.sshRemoveEventSeq();
      await PpdbHandler.sshBackupTle(ppdbFileName, tleFileName);
      await PpdbHandler.sshPutPredictionCommand(predictionCommand);
      await this.sftpHandler.putFile(
        tlePath,
        `${EngineCommand.homeDirectory}${tleFileName}`
      );
      console.log(predictionCommand);
      await PpdbHandler.sshExecEvetnSeqGen();
      await PpdbHandler.sshExecCalculatePpdb();
    } catch (err) {
      console.log(err);
    } finally {
      console.log('making ppdb is finished.');
    }
    // --------------------------calculate PPDB----------------------------//
    // -----------------------------get PPDB-------------------------------//
    try {
      const getFileResult = await this.sftpHandler.getFile(
        this.#FROM_PPDB_PATH,
        ppdbPath
      );
      if (!getFileResult) {
        throw new Error('getFile failed');
      }
      const ppdbFile = await PpdbHandler.readPpdbFileFromLocal(ppdbPath);
      await this.ppdbService.clearPpdbDatabase();
      await this.ppdbService.savePpdbOnDatabase(dateObj, ppdbFile);
      console.log(`Save PPDB at: ${dateObj}`);
    } catch (err) {
      console.error(err);
    } finally {
      console.log('ppdb scheduler finish.');
      this.excuting = false;
    }
    // -----------------------------get PPDB-------------------------------//
  }
}

module.exports = PpdbTask;
