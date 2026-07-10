const users = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Sarah Lee" },
  { id: "3", name: "Team Group" },
];

const UserList = () => {
  return (
    <div className="user-list">
      <h3 className="user-list__title">Active chats</h3>
      <ul className="user-list__items">
        {users.map((user) => (
          <li key={user.id} className="user-list__item">
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
