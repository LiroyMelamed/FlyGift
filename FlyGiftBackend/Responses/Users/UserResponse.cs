﻿using System.Runtime.Serialization;

namespace FlyGiftBackend.Models
{
    [DataContract]
    public class UserResponse : GeneralResponse
    {
        [DataMember]
        public User User { get; set; }  // User Data

        public UserResponse(GeneralResponse parent, User user) : base(parent)
        {
            User = user;
        }
    }
}
