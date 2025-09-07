import { Link } from "react-router-dom";
import Layout from "./Layout";
import { IoMdGlobe } from "react-icons/io";
import { TbCheckupList } from "react-icons/tb";
import { FiClock } from "react-icons/fi";

export default function HomePage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-indigo-600 mb-6">
          Welcome to TodoMaster
        </h1>

        <div className="max-w-2xl mx-auto">
          <p className="text-lg text-gray-700 mb-8">
            Organize your life simply and efficiently. TodoMaster helps you
            manage your daily tasks without effort to stay productive and
            focused on what really matters.
          </p>
        </div>

        <Link
          to="/dashboard"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
              clipRule="evenodd"
            />
          </svg>
          See my to-do
        </Link>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="text-indigo-500 mb-4 flex justify-center">
              <TbCheckupList className="text-[3rem]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy to use</h3>
            <p className="text-gray-600">
              Intuitive interface to manage your tasks.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="text-indigo-500 mb-4 flex justify-center">
              <FiClock className="text-[3rem]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fast and reactive</h3>
            <p className="text-gray-600">
              Smooth experience to allow you to work fast.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <div className="text-indigo-500 mb-4 flex justify-center">
              <IoMdGlobe className="text-[3rem]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Work everywhere</h3>
            <p className="text-gray-600">
              Access your tasks from any device, anywhere.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
