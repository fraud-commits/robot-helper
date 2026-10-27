
let unregisterFilterEventListener = null;
let unregisterMarkSelectionEventListener = null;
let worksheet = null;
let worksheetName = null;
let categoryColumnNumber = null;
let valueColumnNumber = null;
let refreshInProgress = false;
let renderedPlayerIds = [];
let parameterPollTimer = null;
let lastPlayerData = [];
let analysisSort = { key: 'result', direction: 'asc' };





$(document).ready(function () {
   tableau.extensions.initializeAsync().then(function () {
      // Draw the chart when initialising the dashboard.
       getSettings();
       drawChartJS();
       startPlayerParameterMonitor();
       $('#btn-refresh-player').on('click', refreshPlayerExtension);
       $('#player-search').on('input', filterPlayerRows);
       $(document).on('mouseenter focusin', '.signal-info', function(){ showSignalTooltip(this); });
       $(document).on('mouseleave focusout', '.signal-info', hideSignalTooltip);
       $(document).on('click', '.player-analysis-table th[data-sort-key]', function(){
          const key = $(this).data('sort-key');
          analysisSort = { key: key, direction: analysisSort.key === key && analysisSort.direction === 'asc' ? 'desc' : 'asc' };
          if(lastPlayerData.length) renderDetectionSummary(lastPlayerData);
       });
      // Set up the Settings Event Listener.
      unregisterSettingsEventListener = tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
         // On settings change.
      getSettings();
       drawChartJS();
      });
   }, function () { console.log('Error while Initializing: ' +err.toString()); });
});

function normalizePlayerId(value){
  const text = String(value == null ? '' : value).trim();
  const candidate = text.indexOf(':') >= 0 ? text.split(':').pop().trim() : text;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate)) return candidate.toLowerCase();
  const ids = candidate.match(/\d{4,}/g);
  return ids && ids.length ? ids[ids.length - 1] : text.toLowerCase();
}

function isPlayerId(value){
  return /^\d{4,}$/.test(value) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isPlayerSelectorName(value){
  const name = String(value || '').toLowerCase();
  if(!/(player|user)/.test(name)) return false;
  const compact = name.replace(/[^a-z0-9]/g, '');
  return /^(player|user)$/.test(compact) || /(player|user)(id|filter|selector|parameter|tf)/.test(compact);
}

function getSelectedPlayerId(){
  const dashboard = tableau.extensions.dashboardContent.dashboard;
  if(!dashboard) return Promise.resolve([]);
  const parameterIds = dashboard.getParametersAsync ? dashboard.getParametersAsync().then(function(parameters){
    const parameterValues = (parameters || []).filter(function(item){
      return isPlayerSelectorName(item.name);
    }).map(function(parameter){
      const currentValue = parameter.currentValue;
      return normalizePlayerId(currentValue && (currentValue.value != null ? currentValue.value : currentValue.formattedValue));
    }).filter(isPlayerId);
    return parameterValues;
  }).catch(function(){ return []; }) : Promise.resolve([]);
  const worksheets = dashboard.worksheets || [];
  const playerWorksheet = worksheets.find(function(sheet){ return sheet.name === 'fraud2'; }) || worksheets[0];
  if(!playerWorksheet || !playerWorksheet.getFiltersAsync) return parameterIds;
  return playerWorksheet.getFiltersAsync().then(function(filters){
    const playerFilter = (filters || []).find(function(filter){
      return isPlayerSelectorName(filter.fieldName || filter.fieldCaption);
    });
    if(!playerFilter || playerFilter.isAllSelected) return [];
    const values = playerFilter.appliedValues || playerFilter.values || [];
    return values.map(function(item){ return normalizePlayerId(item && (item.value != null ? item.value : item.formattedValue || item)); }).filter(isPlayerId);
  }).catch(function(){ return parameterIds; });
}

function updatePlayerRefreshState(selectedId){
  if(refreshInProgress) return;
  const button = $('#btn-refresh-player');
  const rendered = renderedPlayerIds.map(normalizePlayerId).filter(Boolean);
  const selected = Array.isArray(selectedId) ? selectedId : [selectedId];
  const mismatch = Boolean(selected.length && rendered.length && !rendered.some(function(id){ return selected.indexOf(id) !== -1; }));
  button.toggleClass('refresh-needs-update', mismatch);
  button.attr('data-refresh-tooltip', mismatch ? 'Player ID does not match. Click Refresh.' : 'Refresh extension data');
}

function startPlayerParameterMonitor(){
  if(parameterPollTimer) clearInterval(parameterPollTimer);
  const check = function(){ getSelectedPlayerId().then(updatePlayerRefreshState); };
  check();
  parameterPollTimer = setInterval(check, 5000);
}

function refreshPlayerExtension(){
  if(refreshInProgress) return;
  refreshInProgress = true;
  const button = $('#btn-refresh-player');
  button.removeClass('refresh-needs-update').addClass('refresh-busy').prop('disabled', true);
  $('#refresh-overlay').prop('hidden', false);
  Promise.resolve().then(function(){ return drawChartJS(); }).then(function(){
    button.attr('data-refresh-tooltip', 'Refresh extension data');
  }).catch(function(error){
    console.error('Player refresh failed:', error);
    $('#robot-result-note').text('Refresh failed. Please try again.');
    button.attr('data-refresh-tooltip', 'Refresh failed. Click to try again.');
  }).finally(function(){
    $('#refresh-overlay').prop('hidden', true);
    button.removeClass('refresh-busy').prop('disabled', false);
    refreshInProgress = false;
    getSelectedPlayerId().then(updatePlayerRefreshState);
  });
}

function filterPlayerRows(){
  const query = String($('#player-search').val() || '').trim().toLowerCase();
  $('#dataTable tbody tr').each(function(){
    const playerId = String($(this).children('td').first().text() || '').toLowerCase();
    $(this).toggle(!query || playerId.indexOf(query) !== -1);
  });
}

let signalTooltipTimer = null;
function showSignalTooltip(element){
  clearTimeout(signalTooltipTimer);
  let tooltip = document.getElementById('signal-tooltip-floating');
  if(!tooltip){
    tooltip = document.createElement('div');
    tooltip.id = 'signal-tooltip-floating';
    tooltip.className = 'signal-tooltip-floating';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = element.getAttribute('data-tooltip') || '';
  tooltip.hidden = false;
  const rect = element.getBoundingClientRect();
  const margin = 8;
  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + margin;
  if(top + tooltipRect.height > window.innerHeight - margin) top = rect.top - tooltipRect.height - margin;
  if(left + tooltipRect.width > window.innerWidth - margin) left = window.innerWidth - tooltipRect.width - margin;
  if(left < margin) left = margin;
  if(top < margin) top = margin;
  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
}
function hideSignalTooltip(){
  signalTooltipTimer = setTimeout(function(){
    const tooltip = document.getElementById('signal-tooltip-floating');
    if(tooltip) tooltip.hidden = true;
  }, 80);
}









function getSettings() {


   const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

   var worksheet = worksheets.find(function (sheet) {
     return sheet.name === "fraud2";
   });


   if (unregisterFilterEventListener != null) {
      unregisterFilterEventListener();
   }


   if (unregisterMarkSelectionEventListener != null) {
      unregisterMarkSelectionEventListener();
   }

   // Get worksheet


   // Add listener
   unregisterFilterEventListener = worksheet.addEventListener(tableau.TableauEventType.FilterChanged, (filterEvent) => {
      drawChartJS();
     
   });

   unregisterMarkSelectionEventListener = worksheet.addEventListener(tableau.TableauEventType.MarkSelectionChanged, (filterEvent) => {
      drawChartJS();
   });
  
  
  
}





function drawChartJS() {

   const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;

   var worksheet = worksheets.find(function (sheet) {
     return sheet.name === "fraud2";
   });

  



   

   return worksheet.getSummaryDataAsync().then(function (sumdata) {
     

     

   
    $(".Break-Heat-Map").empty();

     const RoundTime = 0,
           UserId = 0,
           UserName= 6,
           CompanyCode = 1,
           RoundID = 2,
           GameType = 4,
           BetPosition = 7,
           DealerName = 3,
           TableName = 6,
           BetEUR = 8,
           NetEUR = 9;

           let RoundSkipp = 0;
           let ShortBreak = 0;
           let LongBreak = 0;
           let SequentialGame = 0;

           let indexStart,
               indexNext;
          
           let TotalBet = 0;
           let TotalNet = 0;

           let RoundArry= [];
           let RoundArry2= [];
           let RatioArry= [];
           let PlayerData = [];

             let totaltest = 0;
             var worksheetData = sumdata.data;
             const columnLabels = (sumdata.columns || []).map(function(column){ return String([column.fieldName, column.fieldCaption, column.caption].filter(Boolean).join(' ')).toLowerCase(); });
             function findColumn(words, fallback){
               const found = columnLabels.findIndex(function(label){ return words.every(function(word){ return label.indexOf(word) !== -1; }); });
               return found >= 0 ? found : fallback;
             }
             function orderedColumn(position, words){
               const positionExists = worksheetData.some(function(row){ return row && row[position]; });
               const positionLabel = columnLabels[position] || '';
               const positionMatches = words.every(function(word){ return positionLabel.indexOf(word) !== -1; });
               const namedColumn = findColumn(words, -1);
               if(positionExists && (positionMatches || namedColumn < 0)) return position;
               return namedColumn >= 0 ? namedColumn : position;
             }
             const dataColumns = {
               player: orderedColumn(0, ['player','id']),
               time: orderedColumn(1, ['round','time']),
               round: orderedColumn(2, ['round','id']),
               table: orderedColumn(3, ['table','id']),
               position: orderedColumn(4, ['bet','position']),
               bet: orderedColumn(5, ['bet','eur']),
               status: orderedColumn(7, ['status'])
             };
             function valueAt(row, name){
               const cell = worksheetData[row] && worksheetData[row][dataColumns[name]];
               return cell ? cell.formattedValue : '';
             }
     
            let DealerArry =[];
            let BetPositionArry =[];
            let TableArry = [];

            let up = 0,
            down = 0,
            same = 0,
            negativ = 0,
            martingeil = 0,
            chaotic = 0;

            let SideBetArry = ["Banker Bonus", "Banker Pair", "Phoenix Pair", "Player Bonus","Player Pair", "Small","Super 6"];
            


            
         


function Trigger(){

  for (var i = 0; i < worksheetData.length; i++) {

    indexStart = i;
      
    if(i == worksheetData.length - 1){

      indexNext =  worksheetData.length -1


    }else{
      indexNext = i + 1
    }
                              
    if(worksheetData.length > 4){
    //  BreakCounter(indexStart,indexNext)
    }
    RoundTotla(indexStart,indexNext)
  }

 
}
Trigger();

    

// PlayerData array
function RoundTotla(indexStart,indexNext){
 


  let index = PlayerData.findIndex(object => object.PlayerId === valueAt(indexStart, 'player'));


  if (index === -1) {

    PlayerData.push({
      PlayerId: valueAt(indexStart, 'player'),
      status: valueAt(indexStart, 'status'),
      table:  [],
      bet: [],
      time: [],
      gaps: [],
      sessionLenght: 0,
      AvgGaps: 0,
       RoundCount:[],
       BetAmount:[],
       betRecords:[],
       roundBetCounts: {},
       roundTimes: {},
      entropy: function() {
        var roundCombinationCounts = {}; 
        var totalCombinations = 0;
        var entropy = 0;


        this.RoundCount.forEach((roundId, index) => {
            const betCombination = this.bet[index] + "_" + this.BetAmount[index];
            if (!roundCombinationCounts[roundId]) {
                roundCombinationCounts[roundId] = {};
            }
            if (!roundCombinationCounts[roundId][betCombination]) {
                roundCombinationCounts[roundId][betCombination] = 0;
            }
            roundCombinationCounts[roundId][betCombination] += 1;
            totalCombinations += 1;
        });

        var allCombinations = [];
        Object.values(roundCombinationCounts).forEach((combinations) => {
            Object.keys(combinations).forEach((combination) => {
                allCombinations.push(combination); 
            });
        });


    var combinationCounts = {};
    allCombinations.forEach((combination) => {
        combinationCounts[combination] = (combinationCounts[combination] || 0) + 1;
    });


    Object.values(combinationCounts).forEach((count) => {
        var probability = count / totalCombinations;
        entropy -= probability * Math.log2(probability);
    });

    return entropy; 
}



      
      /*
      entropy: function(){
        
       var counts = {};  // create an empty object to store the counts of each value in the sequence
      var entropy = 0;  // initialize entropy to 0
      var sequence = this.bet;
    // loop through the sequence and count the occurrences of each value
    for (var i = 0; i < sequence.length; i++) {
        var value = sequence[i];
        if (counts[value]) {
            counts[value]++;
        } else {
            counts[value] = 1;
        }
    }
  
    // loop through the counts and calculate the entropy
    for (var value in counts) {
        var probability = counts[value] / sequence.length;
        entropy -= probability * Math.log2(probability);
    }
  
    return entropy;
    }


*/

    })
  }

  let RoundTime = 1;

  let element = PlayerData.find(e => e.PlayerId === valueAt(indexStart, 'player'));
  
  //alert(element.RoundCount)
  if (element) {
    
   
     element.BetAmount.push(valueAt(indexStart, 'bet'))
     element.status = valueAt(indexStart, 'status');
     element.betRecords.push({ position: String(valueAt(indexStart, 'position') || ''), amount: valueAt(indexStart, 'bet') });
     let roundKey = String(valueAt(indexStart, 'round') || '');
     element.roundBetCounts[roundKey] = (element.roundBetCounts[roundKey] || 0) + 1;
     element.roundTimes[roundKey] = valueAt(indexStart, 'time');
 //   element.TotalRoundBet += worksheetData[indexStart][BetEUR].value;
  //  element.TotalRoundNet += worksheetData[indexStart][NetEUR].value;
       // element.table.push(worksheetData[indexStart][3].formattedValue)
       // console.log(element.table)
       // let indexx = element.table.findIndex(object => object.table === worksheetData[indexStart][3].formattedValue);



   if (!element.table.includes(valueAt(indexStart, 'table'))) {
           element.table.push(valueAt(indexStart, 'table'));
    }
   if (!element.bet.includes(valueAt(indexStart, 'position'))) {
         element.bet.push(valueAt(indexStart, 'position'));
    }
      
   if (!element.time.includes(valueAt(indexStart, 'time'))) {
       element.time.push(valueAt(indexStart, 'time'));
    }

   if (!element.RoundCount.includes(valueAt(indexStart, 'round'))) {
     element.RoundCount.push(valueAt(indexStart, 'round'));
    }
    


  

  var startTime=moment(valueAt(indexStart, 'time'), "DD-MM-YYYY HH:mm a");
  var endTime=moment(valueAt(indexNext, 'time'), "DD-MM-YYYY HH:mm a");
  var duration = moment.duration(endTime.diff(startTime));
  var hours = parseInt(duration.asHours());
  var minutes = parseInt(duration.asMinutes())-hours*60;
  
  //console.log(duration)
  let fromMinutes = Math.floor(duration.asMinutes());
  element.gaps.push(fromMinutes);

  let lengghtTime = element.time.length - 1;
  var startTimeR=moment(element.time[0], "DD-MM-YYYY HH:mm a");
  var endTimeR=moment(element.time[lengghtTime], "DD-MM-YYYY HH:mm a");
  var durationR = moment.duration(endTimeR.diff(startTimeR));

  
  let fromMinutes2 = Math.floor(durationR.asMinutes());
  element.sessionLenght = fromMinutes2;



  const numbers = element.gaps
  const sum = numbers.reduce((a, b) => a + b, 0);
  const average = sum / numbers.length;


element.AvgGaps  = average;
}



}

console.log(PlayerData)

function renderDetectionSummary(playerData){
  lastPlayerData = playerData || [];
  renderedPlayerIds = (playerData || []).map(function(player){ return player.PlayerId; });
  if(!playerData || !playerData.length){ $('#robot-view').prop('hidden', true); $('#empty-state').show(); $('#initial-loading').prop('hidden', true); $('#no-player-state').prop('hidden', false); return; }
  $('#initial-loading').prop('hidden', true); $('#no-player-state').prop('hidden', true);
  function parseTime(value){ const parsed = moment(String(value || ''), ['DD/MM/YYYY h:mm:ss A','DD/MM/YYYY HH:mm:ss','DD-MM-YYYY HH:mm a'], true); return parsed.isValid() ? parsed.valueOf() : NaN; }
  function analyze(player){
    const roundTimes = Object.keys(player.roundTimes || {}).map(function(key){ return parseTime(player.roundTimes[key]); }).filter(function(value){ return isFinite(value); }).sort(function(a,b){ return a-b; });
    const gaps = []; for(let i=1;i<roundTimes.length;i++){ gaps.push((roundTimes[i] - roundTimes[i-1]) / 1000); }
    const avgGapSec = gaps.length ? gaps.reduce(function(sum,value){ return sum + value; },0) / gaps.length : 0;
    const gapSd = gaps.length ? Math.sqrt(gaps.reduce(function(sum,value){ return sum + Math.pow(value - avgGapSec, 2); },0) / gaps.length) : 0;
    const gapCv = avgGapSec ? gapSd / avgGapSec : 0;
    const longPausePct = gaps.length ? gaps.filter(function(value){ return value > 120; }).length / gaps.length * 100 : 0;
    const records = (player.betRecords || []).map(function(record){ const text = String(record.amount || '').replace(/[^0-9.,-]/g, '').replace(',', '.'); const amount = parseFloat(text); return { position: record.position, amount: amount, key: record.position + '|' + (isFinite(amount) ? amount : '') }; }).filter(function(record){ return record.amount > 0; });
    const amounts = records.map(function(record){ return record.amount; });
    const amountMean = amounts.length ? amounts.reduce(function(sum,value){ return sum + value; },0) / amounts.length : 0;
    const amountSd = amounts.length > 1 ? Math.sqrt(amounts.reduce(function(sum,value){ return sum + Math.pow(value - amountMean, 2); },0) / amounts.length) : 0;
    const betCv = amountMean ? amountSd / amountMean : 0;
    const roundCounts = Object.keys(player.roundBetCounts || {}).map(function(key){ return player.roundBetCounts[key]; });
    const countGroups = {}; roundCounts.forEach(function(value){ countGroups[value] = (countGroups[value] || 0) + 1; });
    const structureMode = roundCounts.length ? Math.max.apply(null, Object.keys(countGroups).map(function(key){ return countGroups[key]; })) : 0;
    const structurePct = roundCounts.length ? structureMode / roundCounts.length * 100 : 0;
    const signatureGroups = {}; records.forEach(function(record){ signatureGroups[record.key] = (signatureGroups[record.key] || 0) + 1; });
    const signatureMode = records.length ? Math.max.apply(null, Object.keys(signatureGroups).map(function(key){ return signatureGroups[key]; })) : 0;
    const signaturePct = records.length ? signatureMode / records.length * 100 : 0;
    const amountGroups = {}; amounts.forEach(function(value){ amountGroups[value] = (amountGroups[value] || 0) + 1; });
    const amountMode = amounts.length ? Math.max.apply(null, Object.keys(amountGroups).map(function(key){ return amountGroups[key]; })) : 0;
    const amountModePct = amounts.length ? amountMode / amounts.length * 100 : 0;
    function hasProgressivePattern(){
      if(amounts.length < 10) return false;
      const rounded = amounts.map(function(value){ return Math.round(value * 100) / 100; });
      for(let period = 2; period <= 8; period++){
        let matches = 0, comparisons = 0;
        for(let i = period; i < rounded.length; i++){
          comparisons++;
          if(rounded[i] === rounded[i - period]) matches++;
        }
        if(comparisons >= 8 && matches / comparisons >= 0.75) return true;
      }
      let longestRun = 1, run = 1, direction = 0;
      for(let i = 1; i < amounts.length; i++){
        const nextDirection = amounts[i] === amounts[i - 1] ? 0 : (amounts[i] > amounts[i - 1] ? 1 : -1);
        if(nextDirection && nextDirection === direction) run++; else run = nextDirection ? 2 : 1;
        if(nextDirection) direction = nextDirection; else direction = 0;
        if(run > longestRun) longestRun = run;
      }
      return longestRun >= 8;
    }
    const progressivePattern = hasProgressivePattern();
    const flatBetting = amounts.length > 1 && betCv <= 0.10;
    const repeatedSignature = signaturePct >= 60;
    const repeatedRoundStructure = structurePct >= 80 && player.bet.length <= 6;
    const bettingMechanism = flatBetting || repeatedSignature || progressivePattern || repeatedRoundStructure;
    const highVariation = betCv > 0.30 && Number(player.entropy()) > 2.50;
    const signalLabels = ['Long session','Rare long pauses','Stable rhythm','Bet Position pattern','Flat betting','Round structure'];
    const signals = [roundTimes.length > 500, longPausePct <= 2, gapCv <= 0.20, player.bet.length <= 6, amounts.length > 1 && betCv <= 0.10, structurePct >= 80];
    const matchedSignals = signalLabels.filter(function(label,index){ return signals[index]; });
    const missedSignals = signalLabels.filter(function(label,index){ return !signals[index]; });
    const count = signals.filter(function(value){ return value; }).length;
    const supportingCount = [signals[0], signals[1], signals[2], signals[3], signals[5]].filter(function(value){ return value; }).length;
    const result = bettingMechanism && supportingCount >= 3 && !highVariation ? 'YES' : ((count >= 2 || (signals[0] && !bettingMechanism)) ? 'SUSPICIOUS' : 'NO');
    const mechanismLabel = flatBetting ? 'Flat betting' : (repeatedSignature ? 'Repeated position + amount' : (progressivePattern ? 'Progressive sequence' : (repeatedRoundStructure ? 'Repeated round structure' : 'None detected')));
    const statusText = String(player.status || '');
    const reportedMatch = statusText.match(/ADVANTAGE\s+(\d+)\s+DAY(?:S)?\s+AGO/i);
    const previouslyReported = reportedMatch ? reportedMatch[1] + ' days ago' : 'NO';
    return { player: player, count: count, result: result, roundCount: roundTimes.length, avgGap: avgGapSec / 60, entropy: Number(player.entropy()) || 0, betCv: betCv, longPausePct: longPausePct, gapCv: gapCv, positionCount: player.bet.length, structurePct: structurePct, matchedSignals: matchedSignals, missedSignals: missedSignals, bettingMechanism: mechanismLabel, highVariation: highVariation, supportingCount: supportingCount, previouslyReported: previouslyReported };
  }
  const analyses = playerData.map(analyze).sort(function(a,b){
    if(analysisSort.key === 'result'){
      const rank = { YES: 0, SUSPICIOUS: 1, NO: 2 };
      const resultDifference = rank[a.result] - rank[b.result];
      if(resultDifference) return analysisSort.direction === 'asc' ? resultDifference : -resultDifference;
      const signalDifference = b.count - a.count;
      if(signalDifference) return signalDifference;
      return String(a.player.PlayerId).localeCompare(String(b.player.PlayerId));
    }
    const values = {
      player: [String(a.player.PlayerId), String(b.player.PlayerId)],
      count: [a.count, b.count],
      session: [a.player.sessionLenght || 0, b.player.sessionLenght || 0],
      rounds: [a.roundCount, b.roundCount],
      gap: [a.avgGap, b.avgGap],
      bets: [a.player.bet.length, b.player.bet.length],
      tables: [a.player.table.length, b.player.table.length],
      betCv: [a.betCv, b.betCv],
      entropy: [a.entropy, b.entropy],
      reported: [a.previouslyReported, b.previouslyReported]
    }[analysisSort.key] || [0, 0];
    const difference = typeof values[0] === 'string' ? values[0].localeCompare(values[1]) : values[0] - values[1];
    return analysisSort.direction === 'asc' ? difference : -difference;
  }), yes = analyses.filter(function(item){ return item.result === 'YES'; }).length, suspicious = analyses.filter(function(item){ return item.result === 'SUSPICIOUS'; }).length, no = analyses.length - yes - suspicious;
  const totalSignals = analyses.reduce(function(sum,item){ return sum + item.count; },0);
  const summaryResult = yes ? 'YES' : (suspicious ? 'SUSPICIOUS' : 'NO');
  const summaryNote = analyses.length === 1 ? 'One player analysed' : (yes + ' YES · ' + suspicious + ' SUSPICIOUS · ' + no + ' NO');
   $('#robot-view').prop('hidden',false); $('#empty-state').hide(); $('#toolbar-player').text(analyses.length + (analyses.length === 1 ? ' PLAYER' : ' PLAYERS')); $('#session-stat').text(Math.round(Math.max.apply(null, analyses.map(function(item){ return item.player.sessionLenght || 0; }))) + ' MIN MAX'); $('#round-stat').text(analyses.reduce(function(sum,item){ return sum + item.roundCount; },0)); $('#gap-stat').text((analyses.reduce(function(sum,item){ return sum + item.avgGap; },0) / analyses.length).toFixed(2) + ' MIN AVG'); $('#signal-stat').text(totalSignals + ' / ' + (analyses.length * 6));
  $('#robot-result').text(analyses.length > 1 ? analyses.length + ' PLAYERS' : summaryResult).removeClass('result-no result-suspicious result-yes').addClass(summaryResult === 'YES' ? 'result-yes' : (summaryResult === 'SUSPICIOUS' ? 'result-suspicious' : 'result-no')); $('#robot-result-note').text(summaryNote);
   $('#signal-list').html('<div class="table-responsive"><table class="table table-striped table-hover player-analysis-table" id="dataTable"><thead><tr><th data-sort-key="player">Player ID</th><th data-sort-key="count">Signals</th><th data-sort-key="session">Session (min)</th><th data-sort-key="rounds">Rounds</th><th data-sort-key="gap">Avg gap</th><th data-sort-key="bets">Bets</th><th data-sort-key="tables">Tables</th><th data-sort-key="betCv">Bet CV</th><th data-sort-key="entropy">Entropy</th><th data-sort-key="reported">Reported?</th><th data-sort-key="result">Robot</th></tr></thead><tbody class="robotTable">' + analyses.map(function(item){ const cls = item.result === 'YES' ? 'result-yes' : (item.result === 'SUSPICIOUS' ? 'result-suspicious' : 'result-no'); const tooltip = 'Matched:\n' + (item.matchedSignals.join(' · ') || 'none') + '\n\nNot matched:\n' + (item.missedSignals.join(' · ') || 'none') + '\n\nMechanism:\n' + item.bettingMechanism + (item.highVariation ? '\nHigh betting variation' : ''); return '<tr><td>' + item.player.PlayerId + '</td><td><span>' + item.count + ' / 6</span><span class="signal-info" tabindex="0" data-tooltip="' + tooltip + '" aria-label="View matched signals">i</span></td><td>' + Math.round(item.player.sessionLenght || 0) + '</td><td>' + item.roundCount + '</td><td>' + item.avgGap.toFixed(2) + '</td><td>' + item.player.bet.length + '</td><td>' + item.player.table.length + '</td><td>' + item.betCv.toFixed(2) + '</td><td>' + item.entropy.toFixed(2) + '</td><td>' + item.previouslyReported + '</td><td><strong class="' + cls + '">' + item.result + '</strong></td></tr>'; }).join('') + '</tbody></table></div>');
   filterPlayerRows();
}
function Gettering(){
  
  let robot;
  
  for(let i = 0; i < PlayerData.length; i++){

    //if((PlayerData[i].RoundCount.length > 300 || PlayerData[i].sessionLenght >= 180 ) && PlayerData[i].entropy() < 2.50 )
    if((PlayerData[i].RoundCount.length > 300 ) && PlayerData[i].entropy() < 2.50 ){

      if(PlayerData[i].AvgGaps > 1 ){
        robot = "True"
      }else if (PlayerData[i].bet.length >= 1){
        robot = "True"
      }
      robot = "True"
      
    }else{
      robot = "False"
    }
    
    
    
   // PlayerData
    
    
    
    
    
    
    
 
    let icone;
    if (robot === "True") { // Check if the robot property is true for the current player
        icone = '<i class="bi bi-robot"></i>';
    } else {
        icone = ''; // Empty cell if not a robot
    }
    

    
    $(".robotTable").append(`
    <tr>
      <td>` + PlayerData[i].PlayerId + `</td>
      <td>` + PlayerData[i].sessionLenght + `</td>
      <td>` + +PlayerData[i].RoundCount.length + `</td>
      <td>`+ PlayerData[i].AvgGaps +` </td>
      <td>`+ PlayerData[i].bet.length +` </td>
      <td>`+ PlayerData[i].table.length +` </td>
      <td>`+ PlayerData[i].entropy() +` </td>
      <td>`+ robot +` </td>
      <td>`+ icone +` </td>
      </tr>
      `
    )




  }
}
$(".robotTable").empty();
Gettering();
renderDetectionSummary(PlayerData)


    











   });
 }




 

 class TableCSVExporter {
  constructor (table, includeHeaders = true) {
      this.table = table;
      this.rows = Array.from(table.querySelectorAll("tr"));

      if (!includeHeaders && this.rows[0].querySelectorAll("th").length) {
          this.rows.shift();
      }
  }

  convertToCSV () {
      const lines = [];
      const numCols = this._findLongestRowLength();

      for (const row of this.rows) {
          let line = "";

          for (let i = 0; i < numCols; i++) {
              if (row.children[i] !== undefined) {
                  line += TableCSVExporter.parseCell(row.children[i]);
              }

              line += (i !== (numCols - 1)) ? "," : "";
          }

          lines.push(line);
      }

      return lines.join("\n");
  }

  _findLongestRowLength () {
      return this.rows.reduce((l, row) => row.childElementCount > l ? row.childElementCount : l, 0);
  }

  static parseCell (tableCell) {
      let parsedValue = tableCell.textContent;

      // Replace all double quotes with two double quotes
      parsedValue = parsedValue.replace(/"/g, `""`);

      // If value contains comma, new-line or double-quote, enclose in double quotes
      parsedValue = /[",\n]/.test(parsedValue) ? `"${parsedValue}"` : parsedValue;

      return parsedValue;
  }
}






