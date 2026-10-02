import { useRef, useState } from 'react';

import buildingsData from './buildings.json';

function EventModal({ isOpen, onClose, onPost }) {

  const fileInputRef = useRef(null);

  const buildings = buildingsData.buildings;

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [isLocationOpen, setIsLocationOpen] =
    useState(false);

  if (!isOpen) {
    return null;
  }

  function handleFiles(event) {
    setSelectedFiles(
      Array.from(event.target.files)
    );
  }

  function handlePost() {
    if (!name.trim() || !location.trim()) {
      return;
    }

    const newEvent = {
      id: `event-${Date.now()}`,
      title: name.trim(),
      location: location.trim(),
      description: description.trim(),
      files: selectedFiles.map(
        (file) => file.name
      ),
      attendeeIds: [],
      comments: []
    };

    onPost(newEvent);

    setName('');
    setLocation('');
    setDescription('');
    setSelectedFiles([]);
  }

  return (
    <div className="modal-overlay">

      <div className="event-modal">

        <div className="modal-header">

          <h2>Make a Post</h2>

          <button
            type="button"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        <div className="modal-body">

          {/* EVENT NAME */}

          <label>
            Event Name

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="What's the event?"
            />

          </label>


          {/* LOCATION */}

          <label>
            Location

            <div className="location-dropdown">

              <input
                type="text"
                value={location}
                onChange={(event) => {
                  setLocation(event.target.value);
                  setIsLocationOpen(true);
                }}
                onFocus={() =>
                  setIsLocationOpen(true)
                }
                placeholder="Search for a building..."
                autoComplete="off"
              />

              {isLocationOpen &&
                location.trim() && (

                <div className="location-options">

                  {buildings
                    .filter((building) => {

                      const search =
                        location.toLowerCase();

                      const nameMatch =
                        building.name
                          .toLowerCase()
                          .includes(search);

                      const aliasMatch =
                        building.Alias.some(
                          (alias) =>
                            alias
                              .toLowerCase()
                              .includes(search)
                        );

                      return (
                        nameMatch ||
                        aliasMatch
                      );
                    })
                    .map((building) => (

                      <button
                        key={building.id}
                        type="button"
                        className="location-option"
                        onClick={() => {
                          setLocation(
                            building.name
                          );

                          setIsLocationOpen(false);
                        }}
                      >

                        <strong>
                          {building.name}
                        </strong>

                        <span>
                          {building.Alias.join(', ')}
                        </span>

                      </button>

                    ))}

                </div>

              )}

            </div>

          </label>


          {/* DESCRIPTION */}

          <label>
            Description

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Tell people about the event..."
              rows="4"
            />

          </label>


          {/* FILES */}

          <div className="modal-file-section">

            <span>Files</span>

            <button
              type="button"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              Choose Files
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="visually-hidden"
              onChange={handleFiles}
            />

            {selectedFiles.length > 0 && (

              <ul>
                {selectedFiles.map((file) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                  >
                    {file.name}
                  </li>
                ))}
              </ul>

            )}

          </div>

        </div>


        <div className="modal-footer">

          <button
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePost}
          >
            Post
          </button>

        </div>

      </div>

    </div>
  );
}

export default EventModal;