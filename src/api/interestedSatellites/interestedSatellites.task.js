/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
const moment = require('moment');
const InterestedSatellitesService = require('./interestedSatellites.service');
const PpdbService = require('../ppdbs/ppdb.service');
const SendEmailHandler = require('../../lib/node-mailer');
const MailingServiceHandler = require('../../lib/mailingService-handler');

class InterestedSatellitesTask {
  /**
   * @param { InterestedSatellitesService } InterestedSatellitesService
   * @param { PpdbService } ppdbService
   */
  constructor(interestedSatellitesService, ppdbService) {
    this.name = 'IS TASK';
    this.period = '0 0 0 * * *';
    this.interestedSatellitesService = interestedSatellitesService;
    this.ppdbService = ppdbService;
    this.handler = this.#sendInterestedConjunctions.bind(this);
  }

  async #sendInterestedConjunctions() {
    const users = await this.interestedSatellitesService.readSubscribingUsers();
    await Promise.all(
      users.map(async (user) => {
        const { email, interestedArray } = user;
        if (interestedArray.length == 0) return;
        const satellitesIds = interestedArray.map((satellite) => satellite.id);
        const conjunctionsForHtml =
          await this.ppdbService.findConjunctionsByIdsService(
            10,
            0,
            'dca',
            satellitesIds,
            false,
          );
        const conjunctionsForCsv = await Promise.all(
          satellitesIds.map(async (satelliteId) =>
            this.ppdbService.findConjunctionsByIdsService(
              0,
              0,
              'tcaTime',
              [satelliteId],
              false,
            ),
          ),
        );
        const metadata = interestedArray.map((object, index) => {
          return {
            id: object.id,
            name: object.name,
            numConjunctions: conjunctionsForCsv[index].totalcount,
          };
        });

        await SendEmailHandler.sendMail(
          email,
          `[SPACEMAP] Daily Conjunctions Report : ${moment
            .utc()
            .format('MMM DD')}`,
          await MailingServiceHandler.conjunctionsToHtml(
            conjunctionsForHtml,
            metadata,
          ),
          await MailingServiceHandler.conjunctionsToAttachment(
            conjunctionsForCsv,
            metadata,
            email,
          ),
        );
      }),
    );

    MailingServiceHandler.removeAllZips();
  }
}

module.exports = InterestedSatellitesTask;
