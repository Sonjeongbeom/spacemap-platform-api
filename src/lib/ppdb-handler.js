const moment = require('moment');
// const DateHandler = require('./date-handler');
const StringHandler = require('./string-handler');
const { promiseReadFile } = require('./promise-io');

class PpdbHandler {
  static async #getPpdbObject(createdAt, rawPpdb) {
    const splitPpdb = rawPpdb.split('\t');
    const [
      pid,
      sid,
      dca,
      tca,
      tcaStart,
      tcaEnd,
      year,
      month,
      date,
      hours,
      min,
      sec,
      probability,
    ] = splitPpdb;

    // console.log(`${year}-${month}-${date}T${hours}:${min}:${sec}Z`);
    let standardTime = moment(
      `${year}-${month}-${date}T${hours}:${min}:${
        sec >= 60.0 ? sec - 0.001 : sec
      }Z`,
      'YYYY-MM-DDTHH:mm:ss.SSSSZ'
    );
    const diffTcaStart = tcaStart > tca ? tcaStart - tcaStart : tcaStart - tca;
    const diffTcaEnd = tcaEnd < tca ? tcaEnd - tcaEnd : tcaEnd - tca;
    let tcaStartTime = standardTime.clone().add(diffTcaStart, 'seconds');
    let tcaTime = standardTime.clone().add(0, 'seconds');
    let tcaEndTime = standardTime.clone().add(diffTcaEnd, 'seconds');

    standardTime = new Date(standardTime.toISOString());
    tcaStartTime = new Date(tcaStartTime.toISOString());
    tcaTime = new Date(tcaTime.toISOString());
    tcaEndTime = new Date(tcaEndTime.toISOString());

    return {
      createdAt,
      pid,
      sid,
      dca,
      tcaTime,
      tcaStartTime,
      tcaEndTime,
      standardTime,
      probability,
    };
  }

  static async getPpdbObjectsArray(createdDateObj, ppdbTexts) {
    const ppdbArray = ppdbTexts.split('\n');
    const filteredPpdbs = ppdbArray.filter(StringHandler.isNotComment);
    const ppdbs = await Promise.all(
      filteredPpdbs.map(async (rawPpdb) => {
        return this.#getPpdbObject(createdDateObj, rawPpdb);
      })
    );
    return ppdbs;
  }

  static async readPpdbFileFromLocal(path) {
    return promiseReadFile(path, {
      encoding: 'utf-8',
    });
  }
}

module.exports = PpdbHandler;
