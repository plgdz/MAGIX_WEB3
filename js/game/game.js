import {CarteHand} from './CarteHand.js'
import { CarteOpp } from './carteOpp.js'

let delay = 1000
let init = true
let yourTurn = null

let spawn = 0

let handPlayer = []
let boardPlayer = []
let uidBdPlayer = []
let hand1 = 0

let handOpp = []
let boardOpp = []
let uidBdOpp = []

let hpOpp = document.querySelector('#hp-opp')
let mpOpp = document.querySelector('#mp-opp')

let hpPlayer = document.querySelector('#hp-player')
let mpPlayer = document.querySelector('#mp-player')

let bdPlayer = document.querySelector('#board-player')
let bdOpp = document.querySelector('#board-opp')
let opp = document.getElementById('avatar-opp')

let cdNumber = document.querySelector('#countdown-number')



const state = () => {
    fetch("ajax-state.php", {   // Il faut créer cette page et son contrôleur appelle 
        method : "POST"        // l’API (games/state)
    })
    .then(response => response.json())
    .then(data => {
        delay = 1000
        console.log(data)
   
        if (typeof data !== "object") {
            if (data == 'LAST_GAME_WON' || data == "LAST_GAME_LOST") {
                console.log('PARTIE TERMINEE')
            }
        } 
        else if (init){
           initDisplay(data)        
        } 
        else {
            updateDisplay(data)
        }

        setTimeout(state, delay); // Attendre 1 seconde avant de relancer l’appel
    })
}



// ------------- SET DRAGGABLE ------------------------------------------------
const playerCardPlayedBoard = (card) => {
    
    let c = card.getTemplate()

    handPlayer.push(card)
    if (3 >= hand1) {
        card.setContainer(document.getElementById("cc1"))
        hand1 += 1
    } else {
        card.setContainer(document.getElementById("cc2"))
    }
    
    Draggable.create('#' + c.id, {
        bounds: document.querySelector('#body'),
        onDrag: function () {
            bdPlayer.style.boxShadow = "0 0 5px 5px #7c725b41"
        },
        onDragEnd: function () {
            c.style.scale = '1'
            bdPlayer.style.boxShadow = "none"
            let hit = this.hitTest(bdPlayer)
                
            if (!hit) {
                gsap.to(this.target, {x: 0, y:0, duration: .5, ease: Back.easeOut(1.7)})
            } else {
                actionPlayerPlay(card)
            }
            // clear style of card
            c.style = ''
        }
    })
    
}

const playerCardSetDragBoard = (cardPlayer) => {
    cardPlayer.setIdBoard()
    let c = cardPlayer.getTemplate()

    if (!Draggable.get('#'+c.id)){
        console.log('set drag board')
        // Set the card on the board draggable
        Draggable.create('#'+c.id, {
            bounds: document.querySelector('#body'),
            onDrag: () => {
              gsap.to('#'+c.id, {scale: .5})
              hittableCard()
            },
            onDragEnd: () => {
                // Get the actualize opponent board to check who's the player is trying to attck
                let hitList = []
                boardOpp.forEach(cardOpp => {
                    hitList.push(document.getElementById('h'+cardOpp.uid))
                })
                console.log(hitList)

                hitList.forEach(hitZone => {
                    if (Draggable.get('#'+c.id).hitTest(hitZone)) {
                        let targetUid = hitZone.id
                        actionPlayerAttack(cardPlayer, targetUid.substring(1))
                    }
                })

                if (Draggable.get('#'+c.id).hitTest(opp)){
                    actionPlayerAttack(cardPlayer, '0')
                }

                gsap.to('#'+c.id, {x:0, y:0, scale:1})                           
            }
        })
    }
    
}

// ------------- ANIMATION CARD OPPONENT --------------------------------------
const oppCardPlayed = () => {
    let playedOpp = handOpp.pop() 
    let card = playedOpp.getTemplate()
    gsap.to(card, {y:200, duration: 1})
    gsap.to(card, {
        rotationY: 360,
        scale:2,
        opacity: 0,
        duration: 1,
        onComplete: function () {
          card.remove()
          }
      })
}

// ------------- PLAYER ACTION -------------------------------------------------
const actionPlayerPlay = (card) => {
  // Increase delay for state by 1sec
  delay += 1000

  let formData = new FormData()
  formData.append("type", "PLAY")
  formData.append("uid", card.uid)

  fetch("ajax-action.php", {   
    method : 'POST',
    body : formData
  })
  .then(response => response.json())
  .then(data => { 
    let c = card.getTemplate()

    if (typeof data !== "object") {
      gsap.to('#'+c.id, {x: 0, y: 0})
    } else {
      updateDisplay(data)

        card.mechanics.forEach(mech => {
            if (mech.includes('Spawn')) {
                spawn = mech.match(/(\d+)/);
            }
        })

        if (card.container == 'cc1') {
        hand1 -= 1;
        }

      // remove card from hand put it in board
      document.getElementById(c.id).remove()


      // reset the position of the div after the drag + reset GSAP origin
      c.style.transform = "translate(" + 0 +","+0+')'
      gsap.set('#'+c.id, {x: 0, y: 0})

      // set the new draggable for the moved card
      playerCardSetDragBoard(card)

      // actualize the hand list and counter
      handPlayer = handPlayer.filter(cr => cr.uid != card.uid)

    }
  })
  
}

const actionPlayerEndTurn = () => {
  // Increase delay for state by 1sec
  delay += 1000

  let formData = new FormData()
  formData.append("type", "END_TURN")

  fetch("ajax-action.php", {   
    method : 'POST',
    body : formData
  })
  .then(response => response.json())
  .then(data => {
    if (typeof data == "object") {
        updateDisplay(data)
    } else {
      console.log(data)
    }
  })

}

const actionPlayerAttack = (card, targetUid) => {
  // Increase delay for state by 1sec
  delay += 1000
  
  let formData = new FormData()
  formData.append("type", "ATTACK")
  formData.append("uid", card.uid)
  formData.append("targetuid", targetUid)

  fetch("ajax-action.php", {   
    method : 'POST',
    body : formData
  })
  .then(response => response.json())
  .then(data => { 
    if (typeof data !== "object") {
        console.log('ERROR : ' + data)
      
    } else {
        updateDisplay(data) 
    }
  })
}

// ----------------- DISPLAY UPDATES -----------------------------
const initDisplay = (data) => {
    yourTurn = data['yourTurn']
    timerBar(data)
    cdNumber.innerHTML = data['remainingTurnTime']

    actualizeHpMp(data)

    // -------------- PLAYER -----------------------------------------
    // Set display of player hand and store data in list handPlayer
    data['hand'].forEach(cardData => {
        let card = new CarteHand(cardData, 'player')
        playerCardPlayedBoard(card)
    })

    // Set display of player board hand store data in 
    data['board'].forEach(cardData => {
        let card = new CarteHand(cardData, 'player')
        card.setContainer(bdPlayer)
        boardPlayer.push(card)
        playerCardSetDragBoard(card)
        uidBdPlayer.push(cardData.uid)
    })


    // ------------------- OPPONENT -----------------------------------
    // Set display of opponent hidden hand
    for (let i = 0; i < data['opponent']['handSize']; i++) {
        handOpp.push(new CarteOpp())
    }

    // Set display of opponent board
    data['opponent']['board'].forEach(cardData => {
        let card = new CarteHand(cardData, 'opponent')
        card.setContainer(bdOpp)
        uidBdOpp.push(cardData.uid)
    })
    boardOpp = data['opponent']['board']
    // Display is set : turn var to false to run the the game from this state (recall if page reloaded during the game to display the actual state)
    init = false
}

const updateDisplay = (data) => {
    if (yourTurn != data['yourTurn']) {
        yourTurn = data['yourTurn']
        timerBar(data)
    }
    cdNumber.innerHTML = data['remainingTurnTime']

    actualizeHpMp(data)
    playableCard(data)

    document.querySelector('#container-card-opp').innerHTML = ''
    for (let i = 0; i < data['opponent']['handSize']; i++) {
        handOpp.push(new CarteOpp())
    }
    // if new card in players hand, add Draggable to this card
    if (data['hand'].length > handPlayer.length) {
        playerCardPlayedBoard(new CarteHand(data['hand'].pop()))
    }

    boardManager(data)
    actualizeCardBoard(data)
}

const boardManager = (data) => {
    // Board opp verification
    let tempOpp = [] 
    data['opponent']['board'].forEach(card => {
        tempOpp.push(card.uid)
    })
    let tmpJoinOp = tempOpp.join('-')

    if (tmpJoinOp != uidBdOpp.join('-')) {
        
        if (tmpJoinOp.length > uidBdOpp.length) {
            oppCardPlayed()
            setTimeout(1000, drawBoardOpp(data))
        } else {
            drawBoardOpp(data)
        }
        
    }
    boardOpp = data['opponent']['board']

    // Board player verification
    let tempPlayer = [] 
    data['board'].forEach(card => {
        tempPlayer.push(card.uid)
    })
    let tmpJoinPl = tempPlayer.join('-')

    if (tmpJoinPl != uidBdPlayer.join('-')) {
        bdPlayer.innerHTML = ""
        uidBdPlayer = []
        data['board'].forEach(cardData => {
            let card = new CarteHand(cardData, 'player')
            card.setContainer(bdPlayer)
            boardPlayer.push(card)
            uidBdPlayer.push(cardData.uid)
            playerCardSetDragBoard(card)
        })
    }

}

const drawBoardOpp = (data) => {
    bdOpp.innerHTML = ""
    uidBdOpp = []
    data['opponent']['board'].forEach(cardData => {
        let card = new CarteHand(cardData, 'opponent')
        card.setContainer(bdOpp)
        uidBdOpp.push(cardData.uid)
    })
}

const actualizeCardBoard = (data) => {  
    drawBoardOpp(data)
    
    data['board'].forEach(cardData => {
        boardPlayer.forEach(cardBoard => {
            if (cardData.uid == cardBoard.uid){
                cardBoard.update(cardData)
            }
        })
    })
}

const actualizeHpMp = (data) => {
    // display hp and mp for both players
    hpOpp.innerHTML = data['opponent']['hp']
    mpOpp.innerHTML = data['opponent']['mp']

    hpPlayer.innerHTML = data['hp']
    mpPlayer.innerHTML = data['mp']
}

const timerBar = () => {
    let timer = document.querySelector('#timer')
    
    if (yourTurn) {
        timer.innerHTML = ""
        document.querySelector('#countdown').style.filter = 'grayscale(0)'
        timer.innerHTML = '<circle class="running-timer" r="40" cx="50" cy="50"></circle>'
    } else {
        timer.innerHTML = ""
        document.querySelector('#countdown').style.filter = 'grayscale(1)'
        timer.innerHTML = '<circle class="running-timer" r="40" cx="50" cy="50"></circle>'
    }
}

const playableCard = (data) => {
    if (yourTurn){
        handPlayer.forEach(card => {
            if (card.cost <= data['mp']) {
                card.getTemplate().classList.add('playable')
            } else {
                card.getTemplate().classList.remove('playable')
            }
        })
        boardPlayer.forEach(card => {
            if (card['state'] == 'IDLE') {
                card.getTemplate().classList.add('playable')
            } else {
                card.getTemplate().classList.remove('playable')
            }
        })
    } else {
        handPlayer.forEach(card => {     
            card.getTemplate().classList.remove('playable')  
        })
        boardPlayer.forEach(card => {
            card.getTemplate().classList.remove('playable')  
        })
    }
}

const hittableCard = () => {
    let taunt = 0
    if (yourTurn){
        boardOpp.forEach(card => {
            if (card.mechanics.length > 0){
                card['mechanics'].forEach(mech => {
                    if (mech.includes('Taunt')) {
                        document.querySelector('#h'+card.uid).className += 'hittable'
                        taunt += 1
                    }
                })

            }
        })
        if (taunt == 0) {
            boardOpp.forEach(card => {
                document.querySelector('#h'+card.uid).className += ' hittable'
                opp.className += ' hittable'                 
            })
        }
    } else {
        boardOpp.forEach(card => {
            document.querySelector('#h'+card.uid).classList.remove('hittable')
            opp.classList.remove('hittable')                    
        })
    }
}


// -------------------------------------------------------------------------------------
window.addEventListener("load", () => {
    // ----------------- STATIC ACTIONS -----------------------
    document.querySelector('#end-turn').addEventListener('click', () => {
      actionPlayerEndTurn()
    })
    
    setTimeout(state, 1000); // Appel initial (attendre 1 seconde)
});


