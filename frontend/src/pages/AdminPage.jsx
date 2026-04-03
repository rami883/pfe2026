import { useEffect, useState } from "react";
import { getRoleLabel } from "../config/roles";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
  import { apiRequest } from "../api/authApi";

function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigate = useNavigate();
  const { logout } = useAuth();

  const token = localStorage.getItem("pfe_auth_token");

  // Fetch pending users
  

const fetchPendingUsers = async () => {
  try {
    const data = await apiRequest("/api/users/pending");
    setPendingUsers(data);
  } catch (error) {
    console.error("Error fetching users:", error);
    setPendingUsers([]);
  } finally {
    setLoading(false);
  }
};
  

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Approve user
  const handleApprove = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/users/approve/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (error) {
      console.error("Approve error:", error);
    }
  };

  // Reject user
  const handleReject = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/users/reject/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPendingUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (error) {
      console.error("Reject error:", error);
    }
  };

  // Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) return <h2>Loading...</h2>;

  return (
    <div style={{ padding: "20px" }}>
      {/* Header with logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1>Admin Dashboard</h1>

        <button onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? "Deconnexion..." : "🚪 Se deconnecter"}
        </button>
      </div>

      <h2>Pending Users</h2>

      {pendingUsers.length === 0 ? (
        <p>No pending users 🎉</p>
      ) : (
        <table border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {pendingUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>{getRoleLabel(user.role)}</td>
                <td>
                  <button onClick={() => handleApprove(user._id)}>
                    ✅ Approve
                  </button>

                  <button
                    onClick={() => handleReject(user._id)}
                    style={{ marginLeft: "10px", color: "red" }}
                  >
                    ❌ Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminPage;