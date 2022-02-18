define([
  'accUtils',
  'knockout',
  'ojs/ojmodel',
  'ojs/ojcollectiondataprovider',
  'jquery',
  'ojs/ojarraydataprovider',
  'ojs/ojlabel',
  'ojs/ojchart',
  'ojs/ojlistview',
  'ojs/ojavatar',
  'ojs/ojdialog',
  'ojs/ojdialog',
  'ojs/ojinputtext',
], function (accUtils, ko, Model, CollectionDataProvider) {
  function DashboardViewModel() {
    var self = this; //generated code

    /**
     * Declare observables and read data from JSON file
     */
    // Master list and detail list observables
    self.activityDataProvider = ko.observable(); //gets data for Activities list
    self.itemsDataProvider = ko.observable(); //gets data for Items list

    self.itemData = ko.observable(''); //holds data for the Item details
    self.newItem = ko.observableArray([]); //holds data for create item dialog

    self.pieSeriesValue = ko.observableArray([]); //holds data for pie chart

    // Activity selection observables
    self.activitySelected = ko.observable(false);
    self.selectedActivity = ko.observable();
    self.firstSelectedActivity = ko.observable();

    // Item selection observables
    self.itemSelected = ko.observable(false);
    self.selectedItem = ko.observable();
    self.firstSelectedItem = ko.observable();

    //var url = 'js/store_data.json'; //defines link to local data file

    // Get Activity objects from file using jQuery method and a method to return a Promise
    /*$.getJSON(url).then(function (data) {
      // Create variable for Activities list and populate using key attribute fetch
      var activitiesArray = data;
      self.activityDataProvider(
        new ArrayDataProvider(activitiesArray, { keyAttributes: 'id' })
      );
    });
    */

    //REST endpoint
    var RESTurl = 'https://apex.oracle.com/pls/apex/oraclejet/lp/activities/';

    //Single line of data
    var activityModel = Model.Model.extend({
      urlRoot: RESTurl,
      idAttribute: 'id',
    });

    //Multiple models i.e. multiple lines of data
    self.myActivity = new activityModel();
    var activityCollection = new Model.Collection.extend({
      url: RESTurl,
      model: self.myActivity,
      comparator: 'id',
    });

    /*
     *An observable called activityDataProvider is already bound in the View file
     *from the JSON example, so you don't need to update dashboard.html
     */
    self.myActivityCol = new activityCollection();
    self.activityDataProvider(new CollectionDataProvider(self.myActivityCol));

    /**
     * Handle selection from Activities list
     */
    self.selectedActivityChanged = function (event) {
      // Check whether click is an Activity selection or a deselection
      if (event.detail.value.length != 0) {
        // If selection, populate and display list
        // Create variable for items list using firstSelectedXxx API from List View
        //var itemsArray = self.firstSelectedActivity().data.items;
        // Populate items list using DataProvider fetch on key attribute
        //self.itemsDataProvider(new ArrayDataProvider(itemsArray, { keyAttributes: 'id' }));

        var activityKey = self.firstSelectedActivity().data.id;
        //REST endpoint for the items list
        var url =
          'https://apex.oracle.com/pls/apex/oraclejet/lp/activities/' +
          activityKey +
          '/items/';

        function parseItem(response) {
          var img = 'css/images/product_images/jet_logo_256.png';
          if (response) {
            //if the response contains items, pick the first one
            if (response.items && response.items.length !== 0) {
              response = response.items[0];
            }
            //if the response contains an image, retain it
            if (response.image !== null) {
              img = response['image'];
            }
            return {
              id: response['id'],
              name: response['name'],
              price: response['price'],
              short_desc: response['short_desc'],
              quantity: response['quantity'],
              quantity_instock: response['quantity_instock'],
              quantity_shipped: response['quantity_shipped'],
              activity_id: response['activity_id'],
              image: img,
            };
          }
        }

        var itemModel = Model.Model.extend({
          urlRoot: url,
          parse: parseItem,
          idAttribute: 'id',
        });

        self.myItem = new itemModel();
        self.itemCollection = new Model.Collection.extend({
          url: url,
          model: self.myItem,
          comparator: 'id',
        });

        /*
         *An observable called itemsDataProvider is already bound in the View file
         *from the JSON example, so you don't need to update dashboard.html
         */
        self.myItemCol = new self.itemCollection();
        self.itemsDataProvider(new CollectionDataProvider(self.myItemCol));

        // Set List View properties
        self.activitySelected(true);
        self.itemSelected(false);
        // Clear item selection
        self.selectedItem([]);
        self.itemData();
      } else {
        // If deselection, hide list
        self.activitySelected(false);
        self.itemSelected(false);
      }
    };

    self.showCreateDialog = function (event) {
      document.getElementById('createDialog').open();
    };

    self.createItem = function (event, data) {
      var recordAttrs = {
        name: data.newItem.itemName,
        price: Number(data.newItem.price),
        short_desc: data.newItem.short_desc,
        quantity_instock: Number(data.newItem.quantity_instock),
        quantity_shipped: Number(data.newItem.quantity_shipped),
        quantity:
          Number(data.newItem.quantity_instock) +
          Number(data.newItem.quantity_shipped),
        activity_id: Number(self.firstSelectedActivity().data.id),
      };
      /*
       *The myItemCol variable is a Collection object that uses the
       *create() function to write a new model to the data service.
       *It also adds this new model to the collection.
       */
      self.myItemCol.create(recordAttrs, {
        wait: true, //Waits for the server call before setting attributes
        contentType: 'application/json',
        success: function (model, response) {
          console.log('Successfully created new item');
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.log('Error in Create: ' + jqXHR.statusCode.caller);
        },
      });
      document.getElementById('createDialog').close();
    };

    self.showEditDialog = function (event) {
      document.getElementById('editDialog').open();
    };

    self.updateItemSubmit = function (event) {
      //myItemCol holds the current data
      var myCollection = self.myItemCol;
      //itemData holds the dialog data
      var myModel = myCollection.get(self.itemData().id);
      myModel.parse = null;
      myModel.save(
        {
          itemId: self.itemData().id,
          name: self.itemData().name,
          price: self.itemData().price,
          short_desc: self.itemData().short_desc,
        },
        {
          contentType: 'application/json',
          success: function (model, response) {
            console.log('response: ' + JSON.stringify(response));
            self.itemData.valueHasMutated();
          },
          error: function (jqXHR, textStatus, errorThrown) {
            console.log(self.itemData().id + ' -- ' + jqXHR);
          },
        }
      );
      document.getElementById('editDialog').close();
    };

    
    self.deleteItem = function (event, data) {
  var itemId = self.firstSelectedItem().data.id;
  var itemName = self.firstSelectedItem().data.name;
      var model = self.myItemCol.get(itemId);
      if (model) {
        var really = confirm(
          'Are you sure you want to delete ' + itemName + '?'
        );
        if (really) {
          //Removes the model from the visible collection
          self.myItemCol.remove(model);
          //Removes the model from the data service
          model.destroy();
        }
      }
};

    /**
     * Handle selection from Activity Items list
     */
    self.selectedItemChanged = function (event) {
      // Check whether click is an Activity Item selection or deselection
      if (event.detail.value.length != 0) {
        // If selection, populate and display Item details
        // Populate items list observable using firstSelectedXxx API
        self.itemData(self.firstSelectedItem().data);
        // Create variable and get attributes of the items list to set pie chart values
        var pieSeries = [
          {
            name: 'Quantity in Stock',
            items: [self.itemData().quantity_instock],
          },
          {
            name: 'Quantity Shipped',
            items: [self.itemData().quantity_shipped],
          },
        ];
        // Update the pie chart with the data
        self.pieSeriesValue(pieSeries);
        self.itemSelected(true);
      } else {
        // If deselection, hide list
        self.itemSelected(false);
      }
    };

    // The following 3 functions are not addressed in this tutorial.

    // Below are a set of the ViewModel methods invoked by the oj-module component.
    // Please reference the oj-module jsDoc for additional information.

    /**
     * This section is standard navdrawer starter template code
     */
    // Below are a set of the ViewModel methods invoked by the oj-module component.
    // Please reference the oj-module jsDoc for additional information.

    /**
     * Optional ViewModel method invoked after the View is inserted into the
     * document DOM.  The application can put logic that requires the DOM being
     * attached here.
     * This method might be called multiple times - after the View is created
     * and inserted into the DOM and after the View is reconnected
     * after being disconnected.
     */
    self.connected = function () {
      accUtils.announce('Dashboard page loaded.', 'assertive');
      document.title = 'Dashboard';
      // Implement further logic if needed
    };

    /**
     * Optional ViewModel method invoked after the View is disconnected from the DOM.
     */
    self.disconnected = function () {
      // Implement if needed
    };

    /**
     * Optional ViewModel method invoked after transition to the new View is complete.
     * That includes any possible animation between the old and the new View.
     */
    self.transitionCompleted = function () {
      // Implement if needed
    };
  }

  /*
   * Returns a constructor for the ViewModel so that the ViewModel is constructed
   * each time the view is displayed.  Return an instance of the ViewModel if
   * only one instance of the ViewModel is needed.
   */
  return new DashboardViewModel();
});
