// ==UserScript==
// @name         Magento - clone static content
// @version      0.1
// @description  Allows clone static content between shops in Magento
// @author       Maxie
// @match        http*://*/*/cms_page/*
// @match        http*://*/*/cms_block/*
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        window.close
// @updateURL    https://github.com/MrMaxie/magento-clone-static/raw/master/magento-clone-static.user.js
// ==/UserScript==

(function(){
	// -- CONSTANTS --
	const ID = '__CMC__';
	const STORE_LIST_SELECTOR = '[name=store_id]';
	const CSS = `
		#${ID} {
			width: 100%;
			text-align: right;
		}
		#${ID} .store-select {
			background: white;
			width: 200px;
			display: inline-block;
			border: 1px solid #dadfe0;
		}
		#${ID} .store-select .header {
			background: url('data:image/gif;base64,R0lGODlhHgA6AMQAAOLi4t/f3+Tk5NTU1NbW1ufn5+zs7Orq6ujo6OXl5dra2tnZ2enp6dfX19vb29zc3N3d3fz8/Pn5+ebm5u3t7dXV1eDg4O7u7tPT0/v7++Pj4+Hh4d7e3gAAAAAAAAAAACH5BAAAAAAALAAAAAAeADoAAAX/YLZdIjmW6KmarEVJLvzG9GzLOJvq657iNeAtWOsZeUjUcCls0nxHKJLIpDaT0azJWe3KtNKw10oOg4/kMRPLNnPf6XO7N6//0vCl3Kyz7zcRGxSBg4KEh4aJhYsABhGNj46Qk5KVkZeOGpmbEZqdnJ6hmRECB6SmpaeqqayorgmmsBGytLG2s7eyDBETu728vsHAw7/FEQUIx8nIys3Mz8vRCAUZ09XU1tnY29fdDQIL3+Hg4uXk5+PpAgoE6+3s7vHw8+/1DgQa9/n4+v38//sCVtDwYGBBggYTIlx4sKEGCAMhPoxIcaJFiRgrcBgAYGNHjh5Dghz5seSADQFOlKZEqbIly5crY8J0GZOmzZcYLGzIuVMnz58+g/bsCXRo0aNCeQYAgGFpU6ZOo0Kd+rSqBgwcrmbFqrUr169bw2qcMLYsB7JnzaJdOzasV7dg33plm7Yu3btm4+qFy7erXbWA//6Vu5cw38B4Bd/tW7jx1sSQEWt0bLiyYsmX01amvBdzZMWMQ2/+TDqvaM5uM5f+GwIAOw==') 0 50% repeat-x;
			border-bottom: 1px solid #d1cfcf;
	    padding-left: 10px;
			line-height: 25px;
			height: 25px;
	    color: #2d444f;
    	font-size: .9em;
			text-align: left;
			font-weight: bold;
		}
		#${ID} .store-select .content {
			text-align: left;
			padding: 5px;
		}
		#${ID} .store-select .content select {
			width: 100%;
		}
		#${ID} .store-select .action {
			color: #2E8B57;
		}
	`;
	let query = [];

	// -- FUNCTIONS --
	function getStoresList() {
		return document.querySelector(STORE_LIST_SELECTOR);
	}

	function pushQuery(oldUrl, newUrl, target) {
		if(query.length === 0 && localStorage.getItem('cmc_action') === null) {
			cloneUrl(oldUrl, newUrl, target);
		}else{
			query.push([oldUrl, newUrl, target]);
		}
	}

	function targetStoreSelector() {
		let div = document.createElement('div');
		div.classList.add('store-select');
		div.innerHTML = `
			<div class='header'>Cloning Target <span class='action'></span></div>
			<div class='content'></div>
		`;
		let list = getStoresList().cloneNode(true);
		list.name = '';
		list.id = 'cmc-clone-target';
		div.querySelector('.content').appendChild(list);
		return div;
	}

	function getHtml() {
		let div = document.createElement('div');
		div.id = ID;
		div.appendChild(targetStoreSelector());
		return div;
	}

	function setAction(txt) {
		document.getElementById(ID).querySelector('.action').innerText = txt;
	}

	function cloneUrl(oldUrl, newUrl, target) {
		let newTabOptions = {
			active: false,
			insert: true
		};

		localStorage.setItem('cmc_action', 'read');
		setAction('Reading');
		let read = GM_openInTab(oldUrl, newTabOptions);
		read.onclose = function() {
			setAction('Changing');
			let form = JSON.parse(localStorage.getItem('cmc_form'));
			form['stores[]'] = target;
			form = JSON.stringify(form);
			localStorage.setItem('cmc_form', form);
			localStorage.setItem('cmc_action', 'write');
			setAction('Writing');
			let write = GM_openInTab(newUrl, newTabOptions);
			write.onclose = function() {
				setAction('Finishing');
				if(query.length > 0) {
					let newArgs = query.shift();
					cloneUrl(newArgs[0], newArgs[1], newArgs[2]);
				} else {
					localStorage.removeItem('cmc_action');
					setAction('');
				}
			};
		};
	}

	function injectCloningAction() {
		for(let tr of document.querySelectorAll('.data tbody tr')) {
			let oldUrl = tr.title;
			let newUrl = /setLocation\('(.*?)'\)/i.exec(
				document.querySelector('.form-buttons .add').getAttribute('onclick')
			)[1];

			let action = document.createElement('a');
			action.href = 'javascript:void(0);';
			action.innerText = 'Clone';
			action.addEventListener('click', function() {
				let input = document.getElementById('cmc-clone-target');
				let target = Array.from(input.selectedOptions).map(x => x.value);
				pushQuery(oldUrl, newUrl, target);
			});
			tr.querySelector('td:last-child').appendChild(action);
		}
	}

	if(!localStorage.getItem('cmc_action')) {
		// -- MAIN --
		let stores = getStoresList();
		if(stores === null) {
			console.error('Initiation aborted. List of stores IDs must be available. You must to modify filters.');
			return;
		}
		GM_addStyle(CSS);
		document.body.querySelector('.middle').appendChild(getHtml());
		injectCloningAction();
	} else {
		setTimeout(function(){
		let action = localStorage.getItem('cmc_action');
		switch(action) {
			// --- READ
			case 'read':
				let formR = document
					.getElementById('edit_form')
					.querySelectorAll('[name]:not([type=hidden])');
				let fDataR = {};
				for(let input of formR) {
					let value = '';
					if(input.multiple) {
						value = Array.from(input.selectedOptions).map(x => x.value);
					} else if(input.type == 'checkbox') {
						value = input.checked;
					} else {
						value = input.value;
					}
					fDataR[input.name] = value;
				}
				localStorage.setItem('cmc_form', JSON.stringify(fDataR));
				window.close();
				break;
			// -- WRITE
			case 'write':

				let btn = document.querySelector('#togglepage_content, #toggleblock_content');
				if(btn !== null) {
					btn.click();
				}

				let fDataW = {};
				try {
					let rawfData = localStorage.getItem('cmc_form');
					localStorage.removeItem('cmc_form');
					fDataW = JSON.parse(rawfData);
				} catch (e) {
					return;
				}
				let formW = document
					.getElementById('edit_form');
				for(let name in fDataW) {
					let input = formW.querySelector(`[name="${name}"]`);
					let value = fDataW[name];
					if(typeof value === 'string') {
						input.value = value;
					} else if(typeof value === 'boolean') {
						input.checked = value;
					} else {
						for(let item of value) {
							input.options.item(item).selected = true;
						}
					}
				}
				localStorage.setItem('cmc_action', 'done');
				editForm.submit();
				//document.querySelector('button.save[onclick="editForm.submit();"]').click();
				break;
			case 'done':
			default:
				window.close();
				// Huh?
		}
	}, 1500);
	}
})();
