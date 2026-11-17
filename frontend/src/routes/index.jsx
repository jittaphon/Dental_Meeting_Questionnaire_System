
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AdminPage from "./AdminPage";
import HomePage from "./HomePage";
import TestSelection from "./TestSelection";
import Questionnaire from "./Questionnaire";
import Certificate from "./Certificate";

export const routes = createBrowserRouter(
  [
    {
      path: "/",
      element: <MainLayout />,
      children: [
        // หน้าแรก
        {
          index: true,
          element: <HomePage />,
        },

        // หน้าเลือกแบบทดสอบ
        {
          path: "tests",
          element: <TestSelection />,
        },

        // หน้า Pre-test
        {
          path: "tests/pre",
          element: <Questionnaire type="PRE" />,
        },

        // หน้า Post-test
        {
          path: "tests/post",
          element: <Questionnaire type="POST" />,
        },

        // หน้าใบประกาศ
        {
          path: "certificate",
          element: <Certificate />,
        },
          {
  path: "admin",
  element: <AdminPage />,
},
  

        // ไม่พบ Route ให้กลับหน้าแรก
        {
          path: "*",
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ],
  {
    basename: "/datahub/dental_meeting_questionnaire_system/public",
  }
);
