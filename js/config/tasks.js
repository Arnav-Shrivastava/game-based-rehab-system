export const TASKS = [
  {
    num: 1,
    id: 'make_tea',
    name: 'Make Tea',
    desc: 'Sequence the steps to make a cup of tea.',
    fullDesc: 'Follow the instructions and choose the correct next step to successfully make a cup of tea.',
    steps: [
      {
        id: 'step_1',
        prompt: 'Step 1: Get ready to boil water',
        options: [
          { text: 'Select the kettle', isCorrect: true },
          { text: 'Select a plate', isCorrect: false, correction: 'You need something to boil water in.' },
          { text: 'Select a fork', isCorrect: false, correction: 'You need something to boil water in.' }
        ]
      },
      {
        id: 'step_2',
        prompt: 'Step 2: Add water',
        options: [
          { text: 'Pour milk', isCorrect: false, correction: 'Tea is usually brewed with hot water first.' },
          { text: 'Pour water', isCorrect: true },
          { text: 'Pour juice', isCorrect: false, correction: 'Tea is usually brewed with hot water first.' }
        ]
      },
      {
        id: 'step_3',
        prompt: 'Step 3: Prepare for drinking',
        options: [
          { text: 'Select a bowl', isCorrect: false, correction: 'Tea is usually drunk from a cup.' },
          { text: 'Select a pan', isCorrect: false, correction: 'Tea is usually drunk from a cup.' },
          { text: 'Select a cup', isCorrect: true }
        ]
      },
      {
        id: 'step_4',
        prompt: 'Step 4: Brew the tea',
        options: [
          { text: 'Steep the tea', isCorrect: true },
          { text: 'Bake the tea', isCorrect: false, correction: 'Tea bags need to be steeped in water.' },
          { text: 'Freeze the tea', isCorrect: false, correction: 'We are making hot tea, it needs to steep.' }
        ]
      }
    ]
  }
];
