App = {
    loading: false,
    contracts: {},
    load: async () => {
        await App.loadWeb3()
        await App.loadAccount()
        await App.loadContract()
        await App.generateL2Address()
        await App.render()
        await App.balance()
    },
    // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
  loadWeb3: async () => {
    const godwokenRpcUrl = 'https://godwoken-testnet-web3-rpc.ckbapp.dev'
    const providerConfig = {
        rollupTypeHash: '0x4cc2e6526204ae6a2e8fcf12f7ad472f41a1606d5b9624beebd215d780809f6a',
        ethAccountLockCodeHash: '0xdeec13a7b8e100579541384ccaf4b5223733e4a5483c3aec95ddc4c1d5ea5b22',
        web3Url:  godwokenRpcUrl
    }

    const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig)

    App.web3Provider = provider
    web3 = new Web3(provider)
  },
  loadAccount: async () => {
    const accounts = await window.ethereum.request({
			method: 'eth_requestAccounts'
		})
		App.account = accounts[0]
  },
  loadContract: async () => {
     try {
			const todoContractAddr = '0xF4087b1f7c58805EC9D26F3291a9A57Af9A0E065'

			const todoList = await $.getJSON('TodoList.json')
			App.contracts.todoList = new web3.eth.Contract(todoList.abi, todoContractAddr)

      // sudt contract
      const sudtContractAddr = '0x4D2f580c412407db683629fCebE6759f33C904a5'
      const sudtErc20Proxy = await $.getJSON('ERC20.json')
			App.contracts.sudtErc20Proxy = new web3.eth.Contract(sudtErc20Proxy.abi, sudtContractAddr)

		} catch (error) {
			console.error(error)
		}
  },
  render: async () => {
      // Prevent double render
    if (App.loading) {
      return
    }

    // Update app loading state
    App.setLoading(true)

    // Render Account
    $('#account').html(App.account)

    // Render Tasks
    await App.renderTasks()

    // Update loading state
    App.setLoading(false)
  },
  renderTasks: async () => {
    // Load the total task count from the blockchain
    const taskCount = await App.contracts.todoList.methods.taskCount().call({
      from: App.account,
			gas: 6000000
		})

    const $taskTemplate = $('.taskTemplate')

    // Render out each task with a new task template
    for (var i = 1; i <= taskCount; i++) {
      // Fetch the task data from the blockchain
      const task = await App.contracts.todoList.methods.tasks(i).call({
        from: App.account,
        gas: 6000000
      })

      console.log(task)
      const taskId = Number(task[0])
      const taskContent = task[1]
      const taskCompleted = task[2]

      // Create the html for the task
      const $newTaskTemplate = $taskTemplate.clone()
      $newTaskTemplate.find('.content').html(taskContent)
      $newTaskTemplate.find('input')
                      .prop('name', taskId)
                      .prop('checked', taskCompleted)
                      .on('click', App.toggleCompleted)

      // Put the task in the correct list
      if (taskCompleted) {
        $('#completedTaskList').append($newTaskTemplate)
      } else {
        $('#taskList').append($newTaskTemplate)
      }

      // Show the task
      $newTaskTemplate.show()
    }
  },
  setLoading: (boolean) => {
    App.loading = boolean
    const loader = $('#loader')
    const content = $('#content')
    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  },
  createTask: async () => {
    App.setLoading(true)

    const content = $('#newTask').val()

    await App.contracts.todoList.methods.createTask(content).send({
       from: App.account,
      gas: 6000000
    })

    window.location.reload()
  },
  toggleCompleted: async (e) => {
    App.setLoading(true)

    const taskId = e.target.name

    await App.contracts.todoList.methods.toggleCompleted(taskId).send({
      from: App.account,
      gas: 6000000
    })

    window.location.reload()
  },
  balance: async () => {
		const addressTranslator = new AddressTranslator()
		const polyjuiceAddress = addressTranslator.ethAddressToGodwokenShortAddress(App.account)
    
    console.log(App.account, polyjuiceAddress)

    $('#eth-address').text(App.account)
    $('#poly-address').text(polyjuiceAddress)

    const l2Balance = await App.contracts.sudtErc20Proxy.methods.balanceOf(polyjuiceAddress).call({
        from: App.account
    })
    $('#poly-address-bal').text(l2Balance)
	},
  generateL2Address: async () => {
    const addressTranslator = new AddressTranslator();
    const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, App.account)

    console.log(`Layer 2 Deposit Address on Layer 1: \n${depositAddress.addressString}`)
    $('#l2-address').text(depositAddress.addressString)
  }
}

$(() => {
    $(window).load(() => {
        App.load()
    })
})
