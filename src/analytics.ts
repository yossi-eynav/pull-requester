import fetch from 'node-fetch';
import * as uuid from 'uuid/v3';

const GUID = uuid();
import * as request from 'request';

function report({category, action}): void {
    const data = {
        v: '1',
        tid: 'UA-54299725-5',
        cid: GUID,
        t: 'event', // Event hit type.
        ec: category, // Event category.
        ea: action, // Event action.
      };
      
      request.post('https://www.google-analytics.com/collect', {
          form: data
      });
}

export { report }