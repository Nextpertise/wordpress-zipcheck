const HARDCODED_MAPPINGS = {
  22000: '22 Mb',
  50000: '50 Mb',
  512000: '500 Mb',
  524000: '500 Mb',
};

const SORT_LIST = ["KPNWBAFIBER", "KPNWBAFTTH/FTTO", "KPNWBAVPLUS", "KPNWBAVVDSL", "KPNWBAVDSL", "KPNWBAADSL", "KPNWBABVDSL", 
                   "TELE2FIBER", "ZIGGOFIBER", "KPNWEASFIBER", "EUROFIBERFIBER", "TELE2COPPER", "KPNWEASCOPPER"]

// See https://github.com/Nextpertise/imp_portal/blob/master/src/filters/bandwidth.js for details. 
function createSpeedDisplayValue(_value) {
  const value = Number(_value);

  const isLessThanAMb = value < 1024;
  const isLessThan3Mb = value < 3000;
  const isGreaterThan95Mb = value > 95000 && value < 1000000;
  const isLessThan1Gb = value < 1000000;

  if (HARDCODED_MAPPINGS[value]) {
      return HARDCODED_MAPPINGS[value];
  }
  if (isLessThanAMb) {
      return `${value} Kb`;
  }
  if (isLessThan3Mb) {
      const mbValue = parseFloat((value / 1024).toFixed(2));
      return `${mbValue} Mb`;
  }
  if (isGreaterThan95Mb) {
      const mbValue = Math.round(value / 1024);
      const roundedMbValue = Math.ceil(mbValue / 10) * 10;

      return `${roundedMbValue} Mb`;
  }
  if (isLessThan1Gb) {
      return `${Math.round(value / 1024)} Mb`;
  }
  return `${Math.round(value / 1024 / 1024)} Gb`;
}

jQuery(document).ready(function($) {
    // Used to check if all the calls have been completed.
    let necessaryProviderCalls;
    let completedProvidercalls = 0;
    // Stores all the results and is sorted after every call.
    let resultsList = [];

    // Extract params from URL.
    // Not using native functionality because it is not supported in all browsers. 
    function getParameters() {
        query = window.location.search.substring(1);
        let vars = query.split("&");
        let results = {};
        for (var i = 0; i < vars.length; i++) {
          var pair = vars[i].split("=");
          var key = decodeURIComponent(pair[0]);
          var value = decodeURIComponent(pair[1]);
          // If first entry with this name
          if (typeof results[key] === "undefined") {
            results[key] = decodeURIComponent(value);
            // If second entry with this name
          } else if (typeof results[key] === "string") {
            var arr = [results[key], decodeURIComponent(value)];
            results[key] = arr;
            // If third or later entry with this name
          } else {
            results[key].push(decodeURIComponent(value));
          }
        }
        return results;
      }

      function hideLoader(){
        $(".postcode-result-box.spinner-box").hide(300);
      }

      // Sorts the list that has all the different options.
      function sortAllResults(){
        function buildString(result){
          if(result['provider'].toUpperCase() === "KPNWBA"){
            return (result['provider'] + result['header']).toUpperCase();
          }else{
            return (result['provider'] + result['carrier']).toUpperCase();
          }
        }

        // Sorts the list based on SORT_LIST
        resultsList.sort(function(a, b){
          let aString = buildString(a);
          let bString = buildString(b);
          try{
            if(SORT_LIST.indexOf(aString) > SORT_LIST.indexOf(bString)){
              return -1;
            }else{
              return 1
            }
          }catch (error) {
            return 0;
          }
        });
      }

      // Renders the list. Should be called after sortAllResults()
      function renderAllResults(){
        $(".result-item").remove();
        $.each(resultsList, function(index, result){
          $(".postcode-result").prepend(createResultBox(result));
        });
      }

      // Adds the address to the header.
      function updateHeaderContent(address){
        let subtitle = "<p>Beschikbare producten op</p>";
        let title = "<h2>" + address["street"] + " " + address['housenr'].toString() + address['housenrext'] + " in " + address['municipality'] + "</h2>";

        $(".postcode-text-part").html(subtitle + title);

      }
    

      // Gets a list of all the available providers.
      // Uses a callback for browser compatiblity.
      function listProviders(callback){
        $.ajax(zipcheck_ajax.ajax_url, {
          method: 'POST',
          data: {'action': 'nextzipcheck_get_all_providers'},
          success: function(data){
              callback(JSON.parse(data));
          }
        })
      }

      // Gets the actual data from the provider.
      function getProviderAvailableData(callback, provider, zipcode, housenr, ext=""){
        $.ajax(zipcheck_ajax.ajax_url, {
          method: 'POST',
          data: {
            'action': 'nextzipcheck_get_available_per_provider',
            'zipcode': zipcode,
            'housenr': housenr,
            'housenrext': ext,
            'provider': provider
          },
          success: function(data){
              callback(JSON.parse(data));
          }
        })
      }

      // Gets data for each provider, loops over the data, adds data to resultlist, calls the sort and render functions.
      function getAndInsertDataFromProviders(providerList){
        let params = getParameters();
        params['zipcheck-ext'] = params['zipcheck-ext'] !== "undefined" ? params['zipcheck-ext'] : ""
        necessaryProviderCalls = providerList.length;

        $.each(providerList, function(index, val){
          // Gets data from API for each provider.
          getProviderAvailableData(
            function(data){
              // Handles loader card
              completedProvidercalls++;
              if(completedProvidercalls >= necessaryProviderCalls){
                hideLoader();
              }

              // Check if provider actually has data.
              if (data !== null && data !== "null"){
                // Updates header with address.
                updateHeaderContent(data['address'])

                // Loops over data and sorts and renders cards.
                $.each(data['available'], function(providerName, provider){
                  $.each(provider, function(header, result){
                    result['header'] = header;
                    result['provider'] = providerName;
                    resultsList.push(result);
                  });
                });
                sortAllResults();
                renderAllResults();
              }
            },
            val, 
            params['zipcheck-zipcode'],
            params['zipcheck-housenr'],
            params['zipcheck-ext'],
          )
        });
      }

      // Create the HTML within JavaScript. Using normal `+` instead of template literals for IE 11 support.  
      function createResultBox(result){
        let title = "<h3>" + result['header'].replace('Fiber', 'Glasvezel') + "</h3>";
        let subtitle = "<p> via " + result['provider'] + "</p>";
        let speedup = '<h3><img src="https://nextpertise.nl/wp-content/uploads/2018/10/arrow-up.svg" alt="down">' + createSpeedDisplayValue(result['max_upload']) + '</h3>';
        let speeddown = '<h3><img src="https://nextpertise.nl/wp-content/uploads/2018/10/arrow-down.svg" alt="down">' + createSpeedDisplayValue(result['max_download']) + '</h3>';
        let shouldAddDivider = (result['area'] !== undefined && result['area'] != "" && result['distance'] !== undefined && result['distance'] != "")
        let area =  result['area'] + (shouldAddDivider ? ", " : "") + result['distance'].replace(";", ", ");
        let smallSubText = (result['carrier'].toUpperCase() === "COPPER" && result['provider'].toUpperCase() === "KPNWBA") ? "Verwachte snelheid" : "";

        let html = '\
          <div class="postcode-result-box result-item">\
            <div class="postcode-left-part">\
              ' + title + subtitle + '\
            </div>\
            <div class="postcode-right-part">\
              <div class="speed-part">\
              ' + speeddown + speedup + '\
              </div>\
              <p>' + area + smallSubText + '</p>\
            </div>\
            <p><p>\
          </div>\
        ';

        return html;
      }

      // Sets the inputs to the inputs submitted.
      function populateState(params){
        params['zipcheck-ext'] = params['zipcheck-ext'] !== "undefined" ? params['zipcheck-ext'] : ""

        global_zipcode = params['zipcheck-zipcode'];
        global_housenr_zipcode = global_zipcode;
        global_housenr = params['zipcheck-housenr'];

        $(".results .zipcheck-zipcode").val(global_zipcode);
        $(".results .zipcheck-housenr").val(global_housenr);
        $(".results .zipcheck-ext").val(params['zipcheck-ext']);
        
        $(document).trigger("zipcheck-results-init");
      }


      listProviders(getAndInsertDataFromProviders);
      populateState(getParameters());

});
