class OverworldMap {
  constructor(config) {
    this.overworld = null;
    this.gameObjects = {}; // Live objects are in here
    this.configObjects = config.configObjects; // Configuration content

    this.cutsceneSpaces = config.cutsceneSpaces || {};
    this.walls = config.walls || {};

    // Image of what are under the character (floor
    this.lowerImage = new Image();
    this.lowerImage.src = config.lowerSrc;

    // Image of what is over the character (tree top, roofs)
    this.upperImage = new Image();
    this.upperImage.src = config.upperSrc;

    this.isCutscenePlaying = false;
    this.isPaused = false;
  }

  drawLowerImage(ctx, cameraPerson) {
    ctx.drawImage(this.lowerImage, utils.withGrid(10.5) - cameraPerson.x, utils.withGrid(6) - cameraPerson.y);
  }

  drawUpperImage(ctx, cameraPerson) {
    ctx.drawImage(this.upperImage, utils.withGrid(10.5) - cameraPerson.x, utils.withGrid(6) - cameraPerson.y);
  }

  isSpaceTaken(currentX, currentY, direction) {
    const { x, y } = utils.nextPosition(currentX, currentY, direction);
    if (this.walls[`${x},${y}`]) {
      return true;
    }

    // Check for game objects at this position
    return Object.values(this.gameObjects).find((obj) => {
      if (obj.x === x && obj.y === y) {
        return true;
      }

      if (obj.intentPosition && obj.intentPosition[0] === x && obj.intentPosition[1] === y) {
        return true;
      }

      return false;
    });
  }

  mountObjects() {
    Object.keys(this.configObjects).forEach((key) => {
      let object = this.configObjects[key];
      object.id = key;

      let instance;

      if (object.type === 'Person') {
        instance = new Person(object);
      }

      if (object.type === 'PizzaStone') {
        instance = new PizzaStone(object);
      }

      this.gameObjects[key] = instance;
      this.gameObjects[key].id = key;
      instance.mount();
    });
  }

  async startCutscene(events) {
    this.isCutscenePlaying = true;

    // Start a loop of async events
    // await each one

    for (let i = 0; i < events.length; i++) {
      const eventHandler = new OverworldEvent({
        event: events[i],
        map: this,
      });
      const result = await eventHandler.init();
      if (result === 'LOST_BATTLE') {
        break;
      }
    }

    this.isCutscenePlaying = false;

    // Reset NPCs to do their idle behavior
    // Object.values(this.gameObjects).forEach((object) => object.doBehaviorEvent(this));
  }

  checkForActionCutscene() {
    const hero = this.gameObjects['hero'];
    const nextCoords = utils.nextPosition(hero.x, hero.y, hero.direction);
    const match = Object.values(this.gameObjects).find((object) => {
      return `${object.x},${object.y}` === `${nextCoords.x},${nextCoords.y}`;
    });

    if (!this.isCutscenePlaying && match && match.talking.length) {
      const relevantScenario = match.talking.find((scenario) => {
        return (scenario.required || []).every((sf) => {
          return playerState.storyFlags[sf];
        });
      });

      relevantScenario && this.startCutscene(relevantScenario.events);
    }
  }

  checkForFootstepCutscene() {
    const hero = this.gameObjects['hero'];
    const match = this.cutsceneSpaces[`${hero.x},${hero.y}`];

    if (!this.isCutscenePlaying && match) {
      this.startCutscene(match[0].events);
    }
  }

  addWall(x, y) {
    this.walls[`${x},${y}`] = true;
  }
}

window.OverworldMaps = {
  DemoRoom: {
    id: 'DemoRoom',
    lowerSrc: '/images/maps/DemoLower.png',
    upperSrc: '/images/maps/DemoUpper.png',
    configObjects: {
      hero: {
        type: 'Person',
        isPlayerControlled: true,
        x: utils.withGrid(5),
        y: utils.withGrid(6),
      },
      npcA: {
        type: 'Person',
        x: utils.withGrid(7),
        y: utils.withGrid(9),
        src: '/images/characters/people/npc1.png',
        behaviorLoop: [
          { type: 'stand', direction: 'left', time: 800 },
          { type: 'stand', direction: 'up', time: 800 },
          { type: 'stand', direction: 'right', time: 1200 },
          { type: 'stand', direction: 'up', time: 300 },
        ],
        talking: [
          {
            required: ['TALKED_TO_ERIO'],
            events: [{ type: 'textMessage', text: "Isn't Erio the coolest?", faceHero: 'npcA' }],
          },
          {
            events: [
              { type: 'textMessage', text: "I'm going to crush you!", faceHero: 'npcA' },
              { type: 'battle', enemyId: 'beth' },
              { type: 'addStoryFlag', flag: 'DEFEATED_BETH' },
              { type: 'textMessage', text: 'You crushed me like weak pepper.', faceHero: 'npcA' },
              // { type: 'textMessage', text: 'Go away!' },
              // { who: 'hero', type: 'walk', direction: 'up' },
            ],
          },
        ],
      },
      npcB: {
        type: 'Person',
        x: utils.withGrid(8),
        y: utils.withGrid(5),
        src: '/images/characters/people/erio.png',
        talking: [
          {
            events: [
              { type: 'textMessage', text: 'Bahaha!', faceHero: 'npcB' },
              { type: 'addStoryFlag', flag: 'TALKED_TO_ERIO' },
              // { type: 'battle', enemyId: 'erio' },
            ],
          },
        ],
        // behaviorLoop: [
        //   { type: 'walk', direction: 'left' },
        //   { type: 'stand', direction: 'up', time: 800 },
        //   { type: 'walk', direction: 'up' },
        //   { type: 'walk', direction: 'right' },
        //   { type: 'walk', direction: 'down' },
        // ],
      },
      pizzaStone: {
        type: 'PizzaStone',
        x: utils.withGrid(2),
        y: utils.withGrid(7),
        storyFlag: 'USED_PIZZA_STONE',
        pizzas: ['v001', 'f001'],
      },
    },
    walls: {
      [utils.asGridCoords(7, 6)]: true,
      [utils.asGridCoords(8, 6)]: true,
      [utils.asGridCoords(7, 7)]: true,
      [utils.asGridCoords(8, 7)]: true,
    },
    cutsceneSpaces: {
      [utils.asGridCoords(7, 4)]: [
        {
          events: [
            { who: 'npcB', type: 'walk', direction: 'left' },
            { who: 'npcB', type: 'stand', direction: 'up', time: 500 },
            { type: 'textMessage', text: "You can't be in there!" },
            { who: 'npcB', type: 'walk', direction: 'right' },
            { who: 'hero', type: 'walk', direction: 'down' },
            { who: 'hero', type: 'walk', direction: 'left' },
          ],
        },
      ],
      [utils.asGridCoords(5, 10)]: [
        {
          events: [
            {
              type: 'changeMap',
              map: 'Kitchen',
              x: utils.withGrid(2),
              y: utils.withGrid(2),
              direction: 'down',
            },
          ],
        },
      ],
    },
  },
  Kitchen: {
    id: 'Kitchen',
    lowerSrc: '/images/maps/KitchenLower.png',
    upperSrc: '/images/maps/KitchenUpper.png',
    configObjects: {
      hero: {
        type: 'Person',
        isPlayerControlled: true,
        x: utils.withGrid(5),
        y: utils.withGrid(5),
      },
      npcB: {
        type: 'Person',
        x: utils.withGrid(10),
        y: utils.withGrid(8),
        src: '/images/characters/people/npc3.png',
        talking: [
          {
            events: [{ type: 'textMessage', text: 'You made it!', faceHero: 'npcB' }],
          },
        ],
      },
    },
    cutsceneSpaces: {
      [utils.asGridCoords(5, 10)]: [
        {
          events: [
            {
              type: 'changeMap',
              map: 'Street',
              x: utils.withGrid(29),
              y: utils.withGrid(9),
              direction: 'down',
            },
          ],
        },
      ],
    },
  },
  Street: {
    id: 'Street',
    lowerSrc: '/images/maps/StreetLower.png',
    upperSrc: '/images/maps/StreetUpper.png',
    configObjects: {
      hero: {
        type: 'Person',
        isPlayerControlled: true,
        x: utils.withGrid(30),
        y: utils.withGrid(10),
      },
    },
    cutsceneSpaces: {
      [utils.asGridCoords(29, 9)]: [
        {
          events: [
            {
              type: 'changeMap',
              map: 'Kitchen',
              x: utils.withGrid(5),
              y: utils.withGrid(10),
              direction: 'up',
            },
          ],
        },
      ],
    },
  },
};
