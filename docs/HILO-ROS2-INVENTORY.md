# Synthetic ROS 2 topic inventory preflight (NON-NORMATIVE)

Version: 2026-11-13. This offline **feasibility checker** helps developers discuss how ROS 2 topic interfaces might eventually map to the six WANTED-10K event classes. It never subscribes to ROS, records a robot, reads rosbag2, certifies a platform or claims field hours. A self-declared topic name/type is **not evidence that the vendor actually exposes it**.

Run:

```bash
python3 tools/hilo_ros2_inventory.py distribution/ros2-synthetic-inventory.json
python3 -m unittest discover -s tools -p test_hilo_ros2_inventory.py -v
```

The example uses deliberately fictional `/fixture/*` topic names and generic `std_msgs/msg/String` types; **these do not describe any manufacturer's real interfaces**. Only synthetic manifests with zero claimed robot hours and no certification request are accepted. The CLI rejects extra fields, per-event payloads, private identifiers, duplicate mappings and files larger than 32 KiB; its output contains class coverage only, never topic names or messages.

Six candidate classes are `DEPLOYMENT_LIFECYCLE`, `ROBOT_STATE`, `HUMAN_REQUEST`, `ROBOT_ACTION`, `HUMAN_INTERVENTION` and `INCIDENT`. Missing classes are reported explicitly. A full mapping is **not** a conformance or safety pass: the checker cannot establish timestamps, intervention duration or cause, provenance, remote takeover, protective stop versus emergency stop, field conditions, participant consent, sampling/stop integrity or human retention decisions.

Before an actual integration, request public/shareable ROS 2 topic and message-type documentation, software-version/clock metadata, manual/remote-control interval evidence, safety-stop reason events and export format. Independently inspect any approved test data through the existing separate privacy, admission and normative-conformance processes; do not upload household video or ingest a vendor's private operational logs. No installation, model spend, hardware, pilot, product endorsement or vendor affiliation is implied.

No changes to frozen WANTED scoring, consent, privacy, safety stop authority, sealed holdouts or experiment cohorts.