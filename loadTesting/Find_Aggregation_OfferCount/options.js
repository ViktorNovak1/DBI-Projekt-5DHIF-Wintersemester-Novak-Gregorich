export let test_options = (() => {

    return {
    stages: [
      { duration: '30s', target: 20000 }, 
    ],
    thresholds: {
      'http_req_duration': ['p(95)<1000'],
      'checks': ['rate>0.99'],
    },
  };
})();

export let path = `/stores/withOfferCount?page=2&limit=100`;