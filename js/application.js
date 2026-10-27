
let unregisterFilterEventListener = null;
let unregisterMarkSelectionEventListener = null;
let worksheet = null;
let worksheetName = null;
let categoryColumnNumber = null;
let valueColumnNumber = null;





$(document).ready(function () {
   tableau.extensions.initializeAsync().then(function () {
      // Draw the chart when initialising the dashboard.
      getSettings();
      drawChartJS();
      // Set up the Settings Event Listener.
      unregisterSettingsEventListener = tableau.extensions.settings.addEventListener(tableau.TableauEventType.SettingsChanged, (settingsEvent) => {
         // On settings change.
      getSettings();
       drawChartJS();
      });
   }, function () { console.log('Error while Initializing: ' +err.toString()); });
});









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

  



   

   worksheet.getSummaryDataAsync().then(function (sumdata) {
     

     

   
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
 


  let index = PlayerData.findIndex(object => object.PlayerId === worksheetData[indexStart][0].formattedValue);


  if (index === -1) {

    PlayerData.push({
      PlayerId: worksheetData[indexStart][0].formattedValue,
      table:  [],
      bet: [],
      time: [],
      gaps: [],
      sessionLenght: 0,
      AvgGaps: 0,
      RoundCount:[],
      BetAmount:[],
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

  let element = PlayerData.find(e => e.PlayerId === worksheetData[indexStart][0].formattedValue);
  
  //alert(element.RoundCount)
  if (element) {
    
   
    element.BetAmount.push(worksheetData[indexStart][5].formattedValue)
 //   element.TotalRoundBet += worksheetData[indexStart][BetEUR].value;
  //  element.TotalRoundNet += worksheetData[indexStart][NetEUR].value;
       // element.table.push(worksheetData[indexStart][3].formattedValue)
       // console.log(element.table)
       // let indexx = element.table.findIndex(object => object.table === worksheetData[indexStart][3].formattedValue);



  if (!element.table.includes(worksheetData[indexStart][3].formattedValue)) {
          element.table.push(worksheetData[indexStart][3].formattedValue);
    }
  if (!element.bet.includes(worksheetData[indexStart][4].formattedValue)) {
        element.bet.push(worksheetData[indexStart][4].formattedValue);
    }
      
  if (!element.time.includes(worksheetData[indexStart][1].formattedValue)) {
      element.time.push(worksheetData[indexStart][1].formattedValue);
    }

  if (!element.RoundCount.includes(worksheetData[indexStart][2].formattedValue)) {
    element.RoundCount.push(worksheetData[indexStart][2].formattedValue);
    }
    


  

  var startTime=moment(worksheetData[indexStart][1].formattedValue, "DD-MM-YYYY HH:mm a");
  var endTime=moment(worksheetData[indexNext][1].formattedValue, "DD-MM-YYYY HH:mm a");
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
Gettering()


    











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






