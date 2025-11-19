export let test_options = (() => {

    return {
    stages: [
      { duration: '10s', target: 10000 }, 
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000'],
      'checks': ['rate>0.99'],
    },
  };
})();

export let path = `/stores`;

export const amount_stores_to_delete = 1000;