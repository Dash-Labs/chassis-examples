$("#loader").hide();

$('#export').click(function() {
     $('#loader').show();
     $.ajax({
       url: "/trips"
     }).done(function(data) {
       $("#loader").hide();
       alert("trips successfully downloaded");
       window.open("data:application/csv;charset=utf-8," + encodeURIComponent(data));
     });

});

