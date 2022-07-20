const EngineCommand = require('./engine-command');
const SftpHandler = require('./sftp-handler');
const SshHandler = require('./ssh-handler');
const moment = require('moment');

class WatcherCatchersHandler {
  static async putParametersRemoteServer(
    remoteFolder,
    remoteInputFilePath,
    remoteOutputFilePath,
    epochTime,
    x,
    y,
    z,
  ) {
    const sshHandler = new SshHandler();
    const sftpHandler = new SftpHandler();
    const mkdirResult = await sftpHandler.mkdir(remoteFolder);
    if (!mkdirResult) {
      throw new Error(
        `Mkdir for parameter file failed. Path : ${remoteFolder}`,
      );
    }
    const paramtersText = await this.makeParametersToText(
      remoteInputFilePath,
      epochTime,
      x,
      y,
      z,
      remoteOutputFilePath,
    );
    const putFileResult = await sshHandler.writeTextToFile(
      paramtersText,
      remoteInputFilePath,
    );
    // const putFileResult = await sftpHandler.putFile(
    //   localFilePath,
    //   remoteFilePath
    // );
    if (!putFileResult) {
      throw new Error(`Put parameter file failed. Path : ${remoteFilePath}`);
    }
  }

  static async makeParametersToText(
    remoteFilePath,
    epochTime,
    x,
    y,
    z,
    remoteOutputFilePath,
  ) {
    const juliaPath =
      '/data/COOP/InterfaceForExternalLib/Julia/CoordinateConversion.jl';
    // let epochTimeOfWatchWindow = [year, month, date, hours, minutes, seconds];
    console.log(epochTime);
    epochTime = moment(epochTime);
    console.log(epochTime);
    const year = epochTime.year();
    const month = epochTime.month() + 1;
    const date = epochTime.date();
    const hours = epochTime.hours();
    const minutes = epochTime.minutes();
    const seconds = epochTime.seconds();
    const watchWindowLength = 3600; //sec
    const altitude = 2000; //km
    const inteferenceRadius = 100; //km
    const cameraAngle = 50; //deg
    const timeIncrement = 10; //sec
    console.log(
      `${remoteFilePath} 
        ${juliaPath}
        ${year} 
        ${month} 
        ${date}
        ${hours} 
        ${minutes}
        ${seconds} 
        ${watchWindowLength}
        0
        ${altitude} 
        ${inteferenceRadius} 
        ${cameraAngle} 
        ${timeIncrement} 
        ${x}
        ${y}
        ${z}
        ${remoteOutputFilePath}`,
    );
    return `${remoteFilePath} ${juliaPath} ${year} ${month} ${date} ${hours} ${minutes} ${seconds} ${watchWindowLength} 0 ${altitude} ${inteferenceRadius} ${cameraAngle} ${timeIncrement} ${x} ${y} ${z} ${remoteOutputFilePath}`;
  }

  static async getFileFromRemoteServer(remoteOutputFilePath, localOutputPath) {
    const sftpHandler = new SftpHandler();
    const getFileResult = await sftpHandler.getFile(
      remoteOutputFilePath,
      localOutputPath,
    );
    if (!getFileResult) {
      throw new Error('get lpdb file from Remote server failed.');
    }
  }

  static makeFilePath(email, filename) {
    const remoteFolder = `${EngineCommand.homeDirectory}${email}/`;
    return {
      remoteFolder,
      remoteInputFilePath: `${remoteFolder}${filename}`,
      remoteOutputFilePath: `${remoteFolder}out_${filename}`,
      localOutputPath: `public/uploads/out_${filename}`,
    };
  }

  static async sshExec(remoteInputFilePath, remoteOutputFilePath, threshold) {
    const sshHandler = new SshHandler();
    const command =
      EngineCommand.getWatcherCatchersCommand(remoteInputFilePath);
    console.log(command);
    const { result, message } =
      await sshHandler.execCalculateWithoutCheckingError(command);
    if (result !== 0) {
      throw new Error(message);
    }
  }
}

module.exports = WatcherCatchersHandler;
