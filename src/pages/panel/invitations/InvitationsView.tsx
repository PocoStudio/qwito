import { useState } from "react";
import { Check, X } from "lucide-react";

function InvitationsView() {
  const [invitations, setInvitations] = useState([
    { id: 1, channel: "Développement", from: "Alice Johnson", date: "2023-06-15" },
    { id: 2, channel: "Marketing", from: "Bob Smith", date: "2023-06-14" },
    { id: 3, channel: "Design", from: "Carol White", date: "2023-06-13" },
  ]);
  
  const handleAccept = (id: number) => {
    // Logique pour accepter l'invitation
    setInvitations(invitations.filter(inv => inv.id !== id));
  };
  
  const handleReject = (id: number) => {
    // Logique pour rejeter l'invitation
    setInvitations(invitations.filter(inv => inv.id !== id));
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invitations</h1>
        <p className="text-muted-foreground mt-2">Gérez vos invitations aux salons de discussion</p>
      </div>
      
      {invitations.length > 0 ? (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="bg-card text-card-foreground rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Invitation au salon #{invitation.channel}</h3>
                  <p className="text-sm text-muted-foreground">De {invitation.from} • {invitation.date}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAccept(invitation.id)}
                    className="bg-green-500 text-white hover:bg-green-600 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 w-8"
                    title="Accepter"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleReject(invitation.id)}
                    className="bg-red-500 text-white hover:bg-red-600 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors h-8 w-8"
                    title="Refuser"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card text-card-foreground rounded-lg border p-6 shadow-sm text-center">
          <p className="text-muted-foreground">Vous n'avez aucune invitation en attente.</p>
        </div>
      )}
    </div>
  );
}

export default InvitationsView;